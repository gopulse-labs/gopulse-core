import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Gopulse } from "../target/types/gopulse";
import * as Spl from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import * as assert from "assert";

describe("gopulse", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Gopulse as Program<Gopulse>;

  let gptMintKeypair = null;
  let gptMint = null;
  let from = null;
  let to = null;
  let fromKeypair = null;
  let toKeypair = null;

  it("Initialize test state", async () => {

    gptMintKeypair = await anchor.web3.Keypair.generate();
    const signature = await program.provider.connection.requestAirdrop(gptMintKeypair.publicKey, 1000000000);
    await program.provider.connection.confirmTransaction(signature);

    gptMint = await Spl.createMint(program.provider.connection, 
        gptMintKeypair,           
        gptMintKeypair.publicKey,       
        null,                         
        6);
    console.log("Created GPT Mint: " + gptMint.toBase58());

    fromKeypair = await anchor.web3.Keypair.generate();
    const signature2 = await program.provider.connection.requestAirdrop(fromKeypair.publicKey, 1000000000);
    await program.provider.connection.confirmTransaction(signature2);

    const mintPublicKey = new PublicKey(gptMint);

    from = await Spl.createAssociatedTokenAccount(
        program.provider.connection, 
        fromKeypair,  
        mintPublicKey,
        fromKeypair.publicKey
    );
    console.log("Created From ATA: " + from.toBase58());

    toKeypair = await anchor.web3.Keypair.generate();
    const signature3 = await program.provider.connection.requestAirdrop(toKeypair.publicKey, 1000000000);
    await program.provider.connection.confirmTransaction(signature3);

    to = await Spl.createAssociatedTokenAccount(
        program.provider.connection, 
        toKeypair,  
        mintPublicKey,
        toKeypair.publicKey
    );
    console.log("Created To ATA: " + to.toBase58());

    const shortMintPublicKey = new PublicKey(from);
    let tx1 = await Spl.mintTo(
        program.provider.connection,
        fromKeypair,
        mintPublicKey,
        shortMintPublicKey,
        gptMintKeypair,
        10000,
    );
    const usdcMintedToShort = await program.provider.connection.getTokenAccountBalance(from);
    console.log("Minted " + usdcMintedToShort.value.amount + " GPT to From");

  });

  it('Post new content', async () => {
    let content;
        content = anchor.web3.Keypair.generate();
        await program.rpc.postV0('content link', new anchor.BN(100), new anchor.BN(53), {
            accounts: {
                content: content.publicKey,
                author: fromKeypair.publicKey,
                to,
                from,
                tokenProgram: Spl.TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            // remainingAccounts: contentAccounts,
            signers: [content, fromKeypair],
        });

    // Fetch the account details of the created content.
    const contentAccount = await program.account.content.fetch(content.publicKey);

    const fromAccount = await program.provider.connection.getTokenAccountBalance(from);
    const toAccount = await program.provider.connection.getTokenAccountBalance(to);

    // Ensure it has the right data.
    assert.equal(contentAccount.author.toBase58(), fromKeypair.publicKey.toBase58());
    assert.equal(contentAccount.contentLink, 'content link');
    assert.equal(fromAccount.value.amount, new anchor.BN(9900));
    assert.equal(toAccount.value.amount, new anchor.BN(100));
    assert.ok(contentAccount.timestamp);
  });

});