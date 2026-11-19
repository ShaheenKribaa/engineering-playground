import { fail, ok, type SimulationResult, type Simulator } from './types'

export interface NetworkPacket {
  id: string
  from: string
  to: string
  protocol: 'DNS' | 'TCP' | 'TLS' | 'HTTP'
  summary: string
  timestamp: number
}

export interface DNSRecord {
  domain: string
  type: 'A' | 'CNAME' | 'NS'
  value: string
  ttl: number
}

export interface NetworkState {
  clientIp: string
  dnsCache: Record<string, string>
  tcpState: 'CLOSED' | 'SYN_SENT' | 'SYN_RECEIVED' | 'ESTABLISHED'
  tlsState: 'NONE' | 'CLIENT_HELLO' | 'SERVER_HELLO_CERT' | 'KEY_EXCHANGED' | 'ENCRYPTED'
  serverIp: string
  packets: NetworkPacket[]
  currentQuery?: string
}

export type NetworkAction =
  | { type: 'dnsQuery'; domain: string }
  | { type: 'flushDns' }
  | { type: 'tcpSyn' }
  | { type: 'tcpSynAck' }
  | { type: 'tcpAck' }
  | { type: 'tlsClientHello' }
  | { type: 'tlsServerHello' }
  | { type: 'tlsKeyExchange' }
  | { type: 'sendHttpRequest'; path: string }

export type NetworkEvent =
  | { type: 'DNS_RESOLVED'; domain: string; ip: string; fromCache: boolean }
  | { type: 'DNS_CACHE_CLEARED' }
  | { type: 'TCP_STATE_CHANGED'; state: string }
  | { type: 'TLS_STATE_CHANGED'; state: string }
  | { type: 'PACKET_TRANSMITTED'; packet: NetworkPacket }

type Result = SimulationResult<NetworkState, NetworkEvent>

export const networkingSimulator: Simulator<NetworkState, NetworkAction, NetworkEvent, void> = {
  id: 'networking',
  version: '1.0.0',

  initialize() {
    return {
      clientIp: '192.168.1.105',
      dnsCache: {},
      tcpState: 'CLOSED',
      tlsState: 'NONE',
      serverIp: '93.184.216.34',
      packets: [],
    }
  },

  execute(state, action): Result {
    const createPacket = (from: string, to: string, protocol: NetworkPacket['protocol'], summary: string): NetworkPacket => ({
      id: `pkt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      from,
      to,
      protocol,
      summary,
      timestamp: Date.now(),
    })

    switch (action.type) {
      case 'dnsQuery': {
        const cached = state.dnsCache[action.domain]
        const events: NetworkEvent[] = []
        const newPackets: NetworkPacket[] = []

        if (cached) {
          const pkt = createPacket(state.clientIp, '192.168.1.1 (Router/Cache)', 'DNS', `Query ${action.domain} -> Cache hit: ${cached}`)
          newPackets.push(pkt)
          events.push({ type: 'DNS_RESOLVED', domain: action.domain, ip: cached, fromCache: true })
          return ok(
            { ...state, packets: [...state.packets, ...newPackets], currentQuery: action.domain },
            events,
            `DNS Cache Hit: ${action.domain} resolved to ${cached} (0ms, no upstream queries)`,
          )
        }

        // Recursive resolution flow: Client -> Resolver -> Root -> TLD -> Authoritative
        const p1 = createPacket(state.clientIp, '8.8.8.8 (Recursive Resolver)', 'DNS', `Recursive query: ${action.domain}`)
        const p2 = createPacket('8.8.8.8', '198.41.0.4 (Root Nameserver .)', 'DNS', `Referral to .com TLD servers`)
        const p3 = createPacket('8.8.8.8', '192.5.6.30 (.com TLD Server)', 'DNS', `Referral to example.com nameservers`)
        const p4 = createPacket('8.8.8.8', 'ns1.example.com (Authoritative)', 'DNS', `A record: ${action.domain} -> 93.184.216.34 (TTL 300)`)
        const p5 = createPacket('8.8.8.8', state.clientIp, 'DNS', `Answer: 93.184.216.34`)

        newPackets.push(p1, p2, p3, p4, p5)
        const ip = '93.184.216.34'
        events.push({ type: 'DNS_RESOLVED', domain: action.domain, ip, fromCache: false })

        return ok(
          {
            ...state,
            dnsCache: { ...state.dnsCache, [action.domain]: ip },
            packets: [...state.packets, ...newPackets],
            currentQuery: action.domain,
          },
          events,
          `DNS Resolution Complete: Recursive query queried Root -> .com TLD -> Authoritative -> ${ip}`,
        )
      }

      case 'flushDns': {
        return ok(
          { ...state, dnsCache: {} },
          [{ type: 'DNS_CACHE_CLEARED' }],
          'Local DNS resolver cache flushed.',
        )
      }

      case 'tcpSyn': {
        const pkt = createPacket(state.clientIp, state.serverIp, 'TCP', 'SYN (seq=1000, len=0, win=65535, mss=1460)')
        return ok(
          { ...state, tcpState: 'SYN_SENT', packets: [...state.packets, pkt] },
          [{ type: 'TCP_STATE_CHANGED', state: 'SYN_SENT' }],
          'TCP Handshake Step 1: Client sent SYN (Synchronize Sequence Numbers) to initiate connection.',
        )
      }

      case 'tcpSynAck': {
        if (state.tcpState !== 'SYN_SENT') return fail(state, 'INVALID_STATE', 'Server only sends SYN-ACK after receiving SYN')
        const pkt = createPacket(state.serverIp, state.clientIp, 'TCP', 'SYN-ACK (seq=5000, ack=1001, win=65535)')
        return ok(
          { ...state, tcpState: 'SYN_RECEIVED', packets: [...state.packets, pkt] },
          [{ type: 'TCP_STATE_CHANGED', state: 'SYN_RECEIVED' }],
          'TCP Handshake Step 2: Server acknowledged client sequence (ack=1001) and sent its own SYN (seq=5000).',
        )
      }

      case 'tcpAck': {
        if (state.tcpState !== 'SYN_RECEIVED') return fail(state, 'INVALID_STATE', 'Client sends final ACK to complete handshake')
        const pkt = createPacket(state.clientIp, state.serverIp, 'TCP', 'ACK (seq=1001, ack=5001) [ESTABLISHED]')
        return ok(
          { ...state, tcpState: 'ESTABLISHED', packets: [...state.packets, pkt] },
          [{ type: 'TCP_STATE_CHANGED', state: 'ESTABLISHED' }],
          'TCP Handshake Step 3: Client sent ACK (ack=5001). 3-way handshake finished! TCP connection ESTABLISHED.',
        )
      }

      case 'tlsClientHello': {
        if (state.tcpState !== 'ESTABLISHED') return fail(state, 'NO_TCP', 'TLS handshake requires an established TCP connection')
        const pkt = createPacket(state.clientIp, state.serverIp, 'TLS', 'Client Hello (TLS 1.3, CipherSuites: TLS_AES_256_GCM_SHA384, KeyShare: X25519)')
        return ok(
          { ...state, tlsState: 'CLIENT_HELLO', packets: [...state.packets, pkt] },
          [{ type: 'TLS_STATE_CHANGED', state: 'CLIENT_HELLO' }],
          'TLS 1.3 Handshake Step 1: Client Hello sent with supported cipher suites and public key share.',
        )
      }

      case 'tlsServerHello': {
        const pkt = createPacket(state.serverIp, state.clientIp, 'TLS', 'Server Hello + Certificate (CN=example.com) + KeyShare')
        return ok(
          { ...state, tlsState: 'SERVER_HELLO_CERT', packets: [...state.packets, pkt] },
          [{ type: 'TLS_STATE_CHANGED', state: 'SERVER_HELLO_CERT' }],
          'TLS 1.3 Handshake Step 2: Server chosen cipher, presented TLS certificate, and sent server key share.',
        )
      }

      case 'tlsKeyExchange': {
        const pkt = createPacket(state.clientIp, state.serverIp, 'TLS', 'Finished [Session Keys Derived via ECDHE]')
        return ok(
          { ...state, tlsState: 'ENCRYPTED', packets: [...state.packets, pkt] },
          [{ type: 'TLS_STATE_CHANGED', state: 'ENCRYPTED' }],
          'TLS 1.3 Handshake Complete: Symmetric AES-GCM session keys derived. All subsequent data is end-to-end encrypted!',
        )
      }

      case 'sendHttpRequest': {
        if (state.tlsState !== 'ENCRYPTED') return fail(state, 'INSECURE', 'HTTPS requests require an encrypted TLS channel')
        const pReq = createPacket(state.clientIp, state.serverIp, 'HTTP', `GET ${action.path} HTTP/2 (Application Data - Encrypted)`)
        const pRes = createPacket(state.serverIp, state.clientIp, 'HTTP', `HTTP/2 200 OK (text/html; charset=UTF-8 - Encrypted)`)
        return ok(
          { ...state, packets: [...state.packets, pReq, pRes] },
          [],
          `HTTP/2 GET ${action.path} -> 200 OK transferred over encrypted TLS socket.`,
        )
      }

      default:
        return ok(state, [], '')
    }
  },
}
