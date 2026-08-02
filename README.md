# x420 BTTF Server

A minimal [x402](https://www.x402.org/) resource server example built with Express and the [Stellar](https://stellar.org/) blockchain. It gates a single endpoint, `GET /bttf`, behind an on-chain USDC micropayment: callers must pay before they can fetch a random *Back to the Future* trivia fact.

This project demonstrates how to turn any HTTP endpoint into a pay-per-call API using the x402 protocol with Stellar's `exact` payment scheme, including a **local, in-process facilitator** that verifies and settles payments without an external HTTP call.

## How it works

1. A client calls `GET /bttf` without payment.
2. The `x402` payment middleware intercepts the request and responds with `HTTP 402 Payment Required`, along with a JSON body describing what's needed: network, price, asset, and the `payTo` address.
3. The client signs and submits a Stellar payment for the requested amount (typically handled automatically by an `@x402/fetch`-compatible client).
4. The local facilitator verifies the payment and settles it on-chain, wrapping the client's transaction in a fee-bump envelope so the client doesn't need XLM to cover Soroban fees.
5. Once payment is confirmed, the middleware lets the request through and the server responds with a random *Back to the Future* fact as JSON.

## Requirements

- [Node.js](https://nodejs.org/) 20+
- A Stellar account address to receive payments (the "merchant" address)
- A funded Stellar account to act as the **facilitator**, which sponsors Soroban transaction fees on behalf of payers
  - On testnet, fund this account for free via the [Stellar Laboratory](https://lab.stellar.org)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your Stellar keys:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `STELLAR_ADDRESS` | The Stellar G-address that receives USDC payments. Any funded testnet account (or even just an address) works — it only receives funds. |
| `STELLAR_FACILITATOR_PRIVATE_KEY` | Private key (`S...`) of the facilitator account. This account must hold XLM on the target network to pay Soroban transaction fees. |
| `PORT` | *(optional)* Port the server listens on. Defaults to `4021`. |
| `PRICE` | *(optional)* Price charged per call to `/bttf`. Defaults to `$0.01`. |
| `STELLAR_NETWORK` | *(optional)* `testnet` or `pubnet`. Defaults to `testnet`. |

### 3. Run the server

```bash
npm start
```

Or, with auto-reload on file changes:

```bash
npm run dev
```

The server starts on `http://localhost:4021` (or your configured `PORT`).

## API

### `GET /bttf`

Returns a random *Back to the Future* fact. Requires payment via the x402 protocol.

**Unpaid request** — returns `402 Payment Required` with payment instructions:

```json
{
  "accepts": [
    {
      "scheme": "exact",
      "price": "$0.01",
      "network": "stellar:testnet",
      "payTo": "G..."
    }
  ]
}
```

**Paid request** — returns `200 OK` with a fact:

```json
{
  "fact": {
    "headline": "The script hit the circular file",
    "description": "The movie \"Back to the Future\" was rejected by every major studio, and the script was thrown in the trash. 44 times was the script rejected, until it finally got accepted by Universal Pictures..."
  }
}
```

## Tech stack

- [Express](https://expressjs.com/) — HTTP server
- [@x402/core](https://www.npmjs.com/package/@x402/core), [@x402/express](https://www.npmjs.com/package/@x402/express) — x402 payment protocol middleware and facilitator
- [@x402/stellar](https://www.npmjs.com/package/@x402/stellar) — Stellar `exact` payment scheme for x402
- [@stellar/stellar-sdk](https://www.npmjs.com/package/@stellar/stellar-sdk) — Stellar SDK
- TypeScript, run via [tsx](https://www.npmjs.com/package/tsx)

## License

Apache-2.0 — see [LICENSE](./LICENSE).
