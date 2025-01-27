import { config } from "dotenv";
import { resolve } from "path";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import {
  utils,
  AnchorProvider,
  Program,
  Wallet,
  BorshCoder,
} from "@coral-xyz/anchor";
import { IDL, Airdrop } from "./target/idl";
console.log(IDL);

config({ path: resolve(__dirname, "../.env") });

import express, { Express, Request, Response, NextFunction } from "express";
import { AppError } from "./utils/AppError";

const app: Express = express();
const port = process.env.PORT || 8080;

app.use((req, res, next) => {
  console.log('[req]:', req.method, req.url)
  console.log('[headers]:', req.headers)

  if (req.headers["token"]) {
    console.log("[auth] token check passed!");
    next();
  } else {
    res.status(401).send({
      errorCode: 401,
      success: false,
      message: "Unauthorized",
    });
    console.log("[auth]: token check failed!");
  }
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use(express.json());

app.get("/api/health", (req: Request, res: Response) => {
  res.send({
    errorCode: 0,
    success: true,
    message: "success",
  });
})

app.post("/api/web/airdrop/status", async (req: Request, res: Response) => {
  try {
    const { publicKey: walletAddress } = req.body;
    const publicKey = new PublicKey(walletAddress);
    const rpcURL = process.env.RPC_URL || "";
    const connection = new Connection(rpcURL);
    const provider = new AnchorProvider(connection, new Wallet(new Keypair()));
    const program = new Program(IDL as Airdrop, provider);
    console.info('[info]', `start check wallet [${publicKey}]`)
  
    const [userPDA] = PublicKey.findProgramAddressSync(
      [utils.bytes.utf8.encode("claim-states"), publicKey?.toBuffer()],
      program.programId
    );
    let claimState = await program.account.claimState.fetch(userPDA);
    console.info('[info]', `wallet [${publicKey}] claim status is ${claimState.claimed}`)

    res.send({
      errorCode: 0,
      success: true,
      message: "success",
      data: {
        claimed: claimState.claimed,
      },
    });
  } catch (error: Error | any) {
    console.error('[error]', error.message);
    res.send({
      errorCode: 1,
      success: false,
      message: error.message,
    });
  }
});

app.all("*", (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(404, `Can't find ${req.originalUrl} on this server!`));
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

process.on("unhandledRejection", (err: Error) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");

  process.exit(1);
});

process.on("uncaughtException", (err: Error) => {
  console.log(err.name, err.message);
  process.exit(1);
});
