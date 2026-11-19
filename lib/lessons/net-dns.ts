import { networkingSimulator, type NetworkAction, type NetworkEvent, type NetworkState } from '@/lib/sim/networking'
import type { Lesson } from './types'

export const netDnsLesson: Lesson<NetworkState, NetworkAction, NetworkEvent> = {
  id: 'net-dns',
  domainId: 'networking',
  title: 'DNS Resolution',
  subtitle: 'Follow a domain lookup through local cache, recursive resolvers, root servers, and authoritative nameservers.',
  minutes: 12,
  level: 'Beginner',
  simulator: networkingSimulator,
  config: undefined,
  legend: [
    { label: 'DNS query / answer', tone: 'blue' },
    { label: 'cache entry', tone: 'green' },
    { label: 'nameserver referral', tone: 'lavender' },
  ],
  learn: [
    { text: 'DNS translates human domain names into machine IP addresses', step: 1 },
    { text: 'Recursive resolvers query root (.), TLD (.com), and authoritative servers', step: 2 },
    { text: 'DNS records are cached with Time-to-Live (TTL) expiration', step: 3 },
    { text: 'Cache hits bypass internet round trips completely (0ms lookup)', step: 4 },
  ],
  metrics: (s) => [
    { label: 'Cached Records', value: String(Object.keys(s.dnsCache).length), icon: 'activity' },
    { label: 'Packets Logged', value: String(s.packets.length), icon: 'branch', highlight: s.packets.length > 0 },
    { label: 'Current Query', value: s.currentQuery ?? 'none', icon: 'head' },
  ],
  steps: [
    {
      label: 'Concept',
      title: 'The phonebook of the internet',
      tag: 'CONCEPT',
      body: [
        'When you type `https://example.com` into your browser, your computer cannot send packets until it knows the destination IP address.',
        'The **Domain Name System (DNS)** is a hierarchical, distributed database that translates domain names into numerical IP addresses.',
      ],
      keyIdea: 'Every web request begins with a DNS lookup.',
      actions: [],
    },
    {
      label: 'Resolve',
      title: 'Iterative query resolution',
      tag: 'TECHNIQUE',
      body: [
        'We query `example.com`. Because our local cache is empty, our computer asks a Recursive Resolver (like `8.8.8.8`).',
        'The resolver queries the **Root Nameserver (.)**, which refers it to the **.com TLD server**, which refers it to the **Authoritative Nameserver** for `example.com`.',
      ],
      keyIdea: 'Resolution walks down the DNS hierarchy from root to authoritative server.',
      changes: [{ kind: 'add', text: 'example.com -> 93.184.216.34' }],
      actions: [
        {
          cmd: 'dig +trace example.com',
          action: { type: 'dnsQuery', domain: 'example.com' },
        },
      ],
    },
    {
      label: 'Cache Hit',
      title: 'The power of DNS caching',
      tag: 'TECHNIQUE',
      body: [
        'When we query `example.com` a second time, the IP address is already stored in the local DNS cache.',
        'No packets are sent across the public internet — the lookup returns instantly in 0ms.',
      ],
      keyIdea: 'DNS caching reduces latency and prevents upstream root server saturation.',
      changes: [{ kind: 'mod', text: 'Cache hit: 0 network roundtrips' }],
      actions: [
        {
          cmd: 'dig example.com (cached)',
          action: { type: 'dnsQuery', domain: 'example.com' },
        },
      ],
    },
    {
      label: 'Flush',
      title: 'Clearing the DNS cache',
      tag: 'TECHNIQUE',
      body: [
        'When web hosts migrate servers or change DNS records, outdated cache entries can cause connection failures.',
        'Flushing the cache forces the resolver to perform a clean lookup from authoritative servers.',
      ],
      keyIdea: 'TTL (Time-to-Live) dictates how long resolvers are allowed to hold cached records.',
      changes: [{ kind: 'del', text: 'Local DNS cache purged' }],
      actions: [
        {
          cmd: 'sudo resolvectl flush-caches',
          action: { type: 'flushDns' },
        },
      ],
    },
    {
      label: 'Recap',
      title: 'Key Takeaways',
      tag: 'RECAP',
      body: [
        'DNS resolution involves Client → Resolver → Root → TLD → Authoritative.',
        'A, CNAME, MX, and NS records control web, alias, email, and delegation routing.',
      ],
      keyIdea: 'Fast, reliable DNS resolution is critical for web application performance.',
      actions: [],
    },
  ],
}
