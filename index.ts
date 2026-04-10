import { config } from "dotenv";
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactStellarScheme as ExactStellarServerScheme } from "@x402/stellar/exact/server";
import { ExactStellarScheme as ExactStellarFacilitatorScheme } from "@x402/stellar/exact/facilitator";
import { x402Facilitator } from "@x402/core/facilitator";
import { createEd25519Signer } from "@x402/stellar";

config();


// ── Environment ────────────────────────────────────────────────────────────────

/**
 * The Stellar G-address that receives USDC payments from callers.
 * Can be any funded testnet account (or just an address – it only receives funds).
 */
const stellarAddress = process.env.STELLAR_ADDRESS as string;

/**
 * Private key of the *facilitator* account.
 * This account must hold XLM on testnet so it can pay the Soroban transaction fees
 * (the "fee bump" that wraps the client-signed transaction before submission).
 * Get free testnet XLM from https://lab.stellar.org
 */
const facilitatorPrivateKey = process.env.STELLAR_FACILITATOR_PRIVATE_KEY as string;

const PORT = Number(process.env.PORT ?? 4021);
const PRICE = process.env.PRICE ?? "$0.01";
const NET = (process.env.STELLAR_NETWORK ?? "testnet") as "testnet" | "pubnet";
const NETWORK = `stellar:${NET}` as const;

// ── Facilitator ────────────────────────────────────────────────────────────────

/**
 * A *local* x402 facilitator – no external HTTP call is needed.
 * It verifies and settles Stellar payments in-process.
 *
 * The facilitator signer's account pays the Soroban transaction fee
 * via a fee-bump envelope (areFeesSponsored: true is the default).
 */
const facilitatorSigner = createEd25519Signer(facilitatorPrivateKey, NETWORK);

const facilitator = new x402Facilitator();
facilitator.register(
  [NETWORK],
  new ExactStellarFacilitatorScheme([facilitatorSigner], {
    areFeesSponsored: true, // facilitator wraps tx in a fee-bump and pays fees
  }),
);

// ── Express app ────────────────────────────────────────────────────────────────

const app = express();

/**
 * x402 payment middleware – gates the /bttf route.
 *
 * When a client calls GET /bttf without payment the middleware returns HTTP 402
 * with a JSON body describing what payment is required (network, price, asset,
 * payTo address). The @x402/fetch client library handles this automatically.
 */
app.use(
  paymentMiddleware(
    {
      "GET /bttf": {
        accepts: [
          {
            scheme: "exact",
            price: PRICE,
            network: NETWORK,
            payTo: stellarAddress,
          },
        ],
        description: "A Back to the Future fact (costs " + PRICE + " USDC on Stellar " + NETWORK + ")",
        mimeType: "application/json",
      },
    },
    // Pass the local facilitator directly – it implements the FacilitatorClient interface
    new x402ResourceServer(facilitator).register(NETWORK, new ExactStellarServerScheme()),
  ),
);

// ── Protected route ────────────────────────────────────────────────────────────

const facts = [
  {
    "headline": "The script hit the circular file",
    "description":"The movie \"Back to the Future\" was rejected by every major studio, and the script was thrown in the trash. 44 times was the script rejected, until it finally got accepted by Universal Pictures. The movie went on to gross over $380 million worldwide, and is now considered a classic."
  },
  {
    "headline": "Working for a living", 
    "description": "Michael J. Fox was working on the \"Family Ties\" show when he was casted for the role as Marty McFly in the \"Back to the Future\" trilogy. He was not granted time off to do the movies though, so he had to film the show doing the day, and film the movie during the evening/night."
  },
  {
    "headline": "Spaceman From Pluto", 
    "description": "The movie almost had a different title. The president of Universal Pictures, Sid Sheinberg, did not like the name \"Back to the Future.\" In a memo to Zemeckis and Gale, he asked them to change the title to \"Spaceman From Pluto.\" But producer Steven Spielberg stepped in and kept the original title."
  },
  {
    "headline": "John DeLorean, CEO of the DeLorean Motor Co.", 
    "description": "John DeLorean wrote Zemeckis and co-writer Bob Gale a letter expressing his gratitude after the movie came out: \“Thanks for continuing my dream in such a positive fashion.\”"
  },
  {
    "headline": "A flying Frigidaire?", 
    "description": "Originally the time machine was going to be a stationary object: a refrigerator. The filmmakers scrapped that idea because they feared children would try to copy the movie and get stuck in discarded devices. Before settling on a DeLorean, they considered a Ford Mustang."
  },
];

app.get("/bttf", (_req, res) => {
  const fact = facts[Math.floor(Math.random() * facts.length)];
  console.log(`Served fact: ${fact.headline}`);
  res.json({ fact });
});

// ── Start ──────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`x402 resource server listening on port ${PORT}`);
});
