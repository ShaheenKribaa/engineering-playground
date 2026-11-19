import { networkingSimulator, type NetworkAction, type NetworkEvent, type NetworkState } from '@/lib/sim/networking'
import type { Lesson } from './types'

export const netTcpLesson: Lesson<NetworkState, NetworkAction, NetworkEvent> = {
  id: 'net-tcp',
  domainId: 'networking',
  title: 'TCP & TLS Handshakes',
  subtitle: 'Master the TCP 3-way handshake (SYN, SYN-ACK, ACK) and modern TLS 1.3 cryptographic session negotiation.',
  minutes: 15,
  level: 'Intermediate',
  simulator: networkingSimulator,
  config: undefined,
  legend: [
    { label: 'TCP handshake', tone: 'yellow' },
    { label: 'TLS 1.3 handshake', tone: 'lavender' },
    { label: 'encrypted HTTP data', tone: 'green' },
  ],
  learn: [
    { text: 'TCP provides reliable, ordered byte-stream delivery over IP', step: 1 },
    { text: 'The 3-way handshake synchronizes sequence and acknowledgment numbers', step: 2 },
    { text: 'TLS 1.3 achieves cryptographic handshake in a single round-trip (1-RTT)', step: 4 },
    { text: 'Diffie-Hellman key exchange creates symmetric encryption keys (AES-GCM)', step: 5 },
    { text: 'HTTPS sends application data inside the secure encrypted socket', step: 6 },
  ],
  metrics: (s) => [
    { label: 'TCP State', value: s.tcpState, icon: 'branch', highlight: s.tcpState === 'ESTABLISHED' },
    { label: 'TLS Security', value: s.tlsState === 'ENCRYPTED' ? 'TLS 1.3 AES-GCM' : s.tlsState, icon: 'head' },
    { label: 'Packets Transferred', value: String(s.packets.length), icon: 'activity' },
  ],
  steps: [
    {
      label: 'Concept',
      title: 'Reliable transport & encryption',
      tag: 'CONCEPT',
      body: [
        'IP packets are best-effort: they can arrive out of order, get duplicated, or be dropped completely.',
        '**TCP (Transmission Control Protocol)** adds reliability, ordering, and flow control. **TLS (Transport Layer Security)** adds confidentiality and authentication.',
      ],
      keyIdea: 'Before a single byte of HTTP data is sent, TCP and TLS must establish reliable, encrypted channels.',
      actions: [],
    },
    {
      label: 'SYN',
      title: 'Step 1: Client SYN',
      tag: 'TECHNIQUE',
      body: [
        'To initiate a connection to port 443, the client sends a `SYN` (Synchronize) packet containing an initial sequence number (`seq=1000`).',
        'TCP state transitions to `SYN_SENT`.',
      ],
      keyIdea: 'SYN announces the client intent to open a reliable connection and provides its sequence starting point.',
      changes: [{ kind: 'add', text: 'Packet: TCP SYN' }],
      actions: [
        {
          cmd: 'connect(93.184.216.34:443) -> SYN sent',
          action: { type: 'tcpSyn' },
        },
      ],
    },
    {
      label: 'SYN-ACK',
      title: 'Step 2: Server SYN-ACK',
      tag: 'TECHNIQUE',
      body: [
        'The server receives the SYN, allocates connection buffers, and replies with `SYN-ACK`.',
        'It acknowledges the client sequence (`ack=1001`) and provides its own initial sequence number (`seq=5000`).',
      ],
      keyIdea: 'SYN-ACK confirms the server is listening and ready to establish bidirectional communication.',
      changes: [{ kind: 'add', text: 'Packet: TCP SYN-ACK' }],
      actions: [
        {
          cmd: 'server reply: SYN-ACK (ack=1001, seq=5000)',
          action: { type: 'tcpSynAck' },
        },
      ],
    },
    {
      label: 'ACK',
      title: 'Step 3: Client ACK [ESTABLISHED]',
      tag: 'TECHNIQUE',
      body: [
        'The client receives the SYN-ACK and sends the final `ACK` (`ack=5001`).',
        'The 3-way handshake is complete! Both sides are in `ESTABLISHED` state and can now exchange application bytes.',
      ],
      keyIdea: 'SYN -> SYN-ACK -> ACK: the foundation of reliable internet communication.',
      changes: [{ kind: 'mod', text: 'TCP Connection: ESTABLISHED' }],
      actions: [
        {
          cmd: 'client reply: ACK (ack=5001) [ESTABLISHED]',
          action: { type: 'tcpAck' },
        },
      ],
    },
    {
      label: 'Client Hello',
      title: 'TLS 1.3: Client Hello',
      tag: 'TECHNIQUE',
      body: [
        'With TCP established, the client initiates the TLS handshake by sending `Client Hello`.',
        'In TLS 1.3, the client includes supported cryptographic ciphers (e.g. `TLS_AES_256_GCM_SHA384`) and generates an ephemeral Diffie-Hellman public key share (`X25519`).',
      ],
      keyIdea: 'TLS 1.3 combines cipher negotiation and key exchange into a single round trip.',
      changes: [{ kind: 'add', text: 'Packet: TLS Client Hello' }],
      actions: [
        {
          cmd: 'openssl s_client -connect example.com:443 (Client Hello)',
          action: { type: 'tlsClientHello' },
        },
      ],
    },
    {
      label: 'Server Hello',
      title: 'TLS 1.3: Server Hello & Certificate',
      tag: 'TECHNIQUE',
      body: [
        'The server selects the cipher suite, responds with its public key share, and presents its X.509 digital certificate signed by a trusted Certificate Authority (CA).',
        'The client validates the digital signature to prevent man-in-the-middle attacks.',
      ],
      keyIdea: 'Certificates prove server authenticity; key shares enable secure secret derivation.',
      changes: [{ kind: 'add', text: 'Packet: Server Hello + Certificate' }],
      actions: [
        {
          cmd: 'server reply: Server Hello + Certificate (CN=example.com)',
          action: { type: 'tlsServerHello' },
        },
      ],
    },
    {
      label: 'Key Exchange',
      title: 'Deriving symmetric keys',
      tag: 'TECHNIQUE',
      body: [
        'Using Elliptic Curve Diffie-Hellman (ECDHE), both client and server independently compute the shared secret without ever sending the secret over the wire.',
        'Symmetric encryption keys are derived. The channel is now encrypted!',
      ],
      keyIdea: 'Asymmetric cryptography negotiates fast symmetric keys for session data.',
      changes: [{ kind: 'mod', text: 'TLS State: ENCRYPTED' }],
      actions: [
        {
          cmd: 'derive_session_keys() -> Finished',
          action: { type: 'tlsKeyExchange' },
        },
      ],
    },
    {
      label: 'HTTP/2',
      title: 'Sending encrypted HTTP requests',
      tag: 'TECHNIQUE',
      body: [
        'The browser sends `GET / HTTP/2`. The payload is encrypted with AES-256-GCM before transmission.',
        'Eavesdroppers on public Wi-Fi or transit networks only see ciphertext.',
      ],
      keyIdea: 'HTTPS is HTTP wrapped in a TLS encrypted tunnel.',
      changes: [{ kind: 'add', text: 'Encrypted HTTP/2 GET & 200 OK' }],
      actions: [
        {
          cmd: 'GET / HTTP/2 (Encrypted Application Data)',
          action: { type: 'sendHttpRequest', path: '/' },
        },
      ],
    },
    {
      label: 'Recap',
      title: 'Summary',
      tag: 'RECAP',
      body: [
        'TCP 3-way handshake establishes a reliable, bidirectional byte stream.',
        'TLS 1.3 authenticates identity via certificates and encrypts traffic with ephemeral Diffie-Hellman keys.',
      ],
      keyIdea: 'Together, TCP and TLS provide the secure, dependable backbone of the modern web.',
      actions: [],
    },
  ],
}
