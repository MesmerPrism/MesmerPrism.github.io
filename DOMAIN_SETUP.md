# Domain Setup

Checked and prepared on 2026-03-31 for `mesmerprism.com`.

## Goal

Point the Squarespace-managed domain `mesmerprism.com` at this GitHub Pages
repository.

## Before changing DNS

1. In GitHub, open `MesmerPrism/MesmerPrism.github.io`.
2. Go to `Settings -> Pages`.
3. Set the custom domain to `mesmerprism.com`.
4. If GitHub offers domain verification for Pages, complete that first.

The repo already includes a `CNAME` file with `mesmerprism.com`.

## Squarespace DNS target

Remove only the Squarespace records that conflict with web hosting for:

- `@`
- `www`

Do not remove unrelated mail or verification records such as:

- `MX`
- mail-related `TXT`
- `DKIM`
- `DMARC`
- unrelated `CAA`

## Records to add

### Apex domain

Add these `A` records for host `@`:

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

Optional IPv6 `AAAA` records for host `@`:

- `2606:50c0:8000::153`
- `2606:50c0:8001::153`
- `2606:50c0:8002::153`
- `2606:50c0:8003::153`

### WWW

Add a `CNAME` record:

- host: `www`
- value: `MesmerPrism.github.io`

Do not point `www` to `mesmerprism.com`.

### Rusty XR relay subdomain

The Quest-to-Quest relay is not hosted by GitHub Pages. Keep the existing
`@` and `www` records pointed at GitHub Pages, and add a separate record for
the relay host after the relay VM or public relay endpoint exists:

- type: `A`
- host: `relay`
- value: `<public IPv4 address of the relay server>`
- TTL: default or 300 seconds while testing

If the relay provider gives a stable hostname instead of a fixed IP, use a
`CNAME` record instead:

- type: `CNAME`
- host: `relay`
- value: `<provider relay hostname>`

Do not point `relay` to `MesmerPrism.github.io` or `mesmerprism.com`; GitHub
Pages can only serve static web content, not the TCP relay process.

## After changing DNS

1. Wait for propagation.
2. In GitHub Pages settings, wait until the domain check passes.
3. Enable `Enforce HTTPS` once GitHub offers it.
4. Confirm that both `https://mesmerprism.com` and `https://www.mesmerprism.com`
   resolve correctly.

## Windows verification commands

Use PowerShell:

```powershell
Resolve-DnsName mesmerprism.com
Resolve-DnsName www.mesmerprism.com
Resolve-DnsName relay.mesmerprism.com
```

You want to see the GitHub Pages `A` records on the apex and a `CNAME` from
`www` to `MesmerPrism.github.io`.

For the relay subdomain, you want to see either the relay server IPv4 address
or a CNAME chain that eventually resolves to it.
