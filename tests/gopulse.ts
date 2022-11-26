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
  let poster = null;
  let posterKeypair = null;
  let vault = null;
  let vaultKeypair = null;
  let validator = null;
  let validatorKeypair = null;
  let contentAccount = null;
  let content = null;

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

    posterKeypair = await anchor.web3.Keypair.generate();
    const signature2 = await program.provider.connection.requestAirdrop(posterKeypair.publicKey, 1000000000);
    await program.provider.connection.confirmTransaction(signature2);

    const mintPublicKey = new PublicKey(gptMint);

    poster = await Spl.createAssociatedTokenAccount(
        program.provider.connection, 
        posterKeypair,  
        mintPublicKey,
        posterKeypair.publicKey
    );
    console.log("Created Poster ATA: " + poster.toBase58());

    vaultKeypair = await anchor.web3.Keypair.generate();
    const signature3 = await program.provider.connection.requestAirdrop(vaultKeypair.publicKey, 1000000000);
    await program.provider.connection.confirmTransaction(signature3);

    vault = await Spl.createAssociatedTokenAccount(
        program.provider.connection, 
        vaultKeypair,  
        mintPublicKey,
        vaultKeypair.publicKey
    );
    console.log("Created Vault ATA: " + vault.toBase58());

    const shortMintPublicKey = new PublicKey(poster);
    let tx1 = await Spl.mintTo(
        program.provider.connection,
        posterKeypair,
        mintPublicKey,
        shortMintPublicKey,
        gptMintKeypair,
        10000,
    );
    const gptMintedToPoster = await program.provider.connection.getTokenAccountBalance(poster);
    console.log("Minted " + gptMintedToPoster.value.amount + " GPT to Poster");

    validatorKeypair = await anchor.web3.Keypair.generate();
    const signature4 = await program.provider.connection.requestAirdrop(validatorKeypair.publicKey, 1000000000);
    await program.provider.connection.confirmTransaction(signature4);

    validator = await Spl.createAssociatedTokenAccount(
        program.provider.connection, 
        validatorKeypair,  
        mintPublicKey,
        validatorKeypair.publicKey
    );
    console.log("Created Validator ATA: " + vault.toBase58());

    const validatorMintPublicKey = new PublicKey(validator);
    let tx2 = await Spl.mintTo(
        program.provider.connection,
        validatorKeypair,
        mintPublicKey,
        validatorMintPublicKey,
        gptMintKeypair,
        10000,
    );
    const gptMintedToValidator = await program.provider.connection.getTokenAccountBalance(validator);
    console.log("Minted " + gptMintedToValidator.value.amount + " GPT to Validator");

  });

  content = anchor.web3.Keypair.generate();

  it('Post new content', async () => {
    // content = anchor.web3.Keypair.generate();
        await program.rpc.postV0('content link', new anchor.BN(100), new anchor.BN(53), {
            accounts: {
                content: content.publicKey,
                author: posterKeypair.publicKey,
                poster,
                vault,
                tokenProgram: Spl.TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            // remainingAccounts: contentAccounts,
            signers: [content, posterKeypair],
        });

    // Fetch the account details of the created content.
    contentAccount = await program.account.content.fetch(content.publicKey);
    console.log("Content Publickey: " + content.publicKey.toString());

    const posterAccount = await program.provider.connection.getTokenAccountBalance(poster);
    const vaultAccount = await program.provider.connection.getTokenAccountBalance(vault);

    // Ensure it has the right data.
    assert.equal(contentAccount.author.toBase58(), posterKeypair.publicKey.toBase58());
    assert.equal(contentAccount.contentLink, 'content link');
    assert.equal(posterAccount.value.amount, new anchor.BN(9900));
    assert.equal(vaultAccount.value.amount, new anchor.BN(100));
    assert.ok(contentAccount.timestamp);
    
    console.log("Content Author: " + contentAccount.author);
    console.log("Content Timestamp: " + contentAccount.timestamp);
    console.log("Content Link: " + contentAccount.contentLink);
    console.log("Content Amount: " + contentAccount.amount);
    console.log("Content Validator Threshold: " + contentAccount.validatorThreshold);

    const vaultAmount = await program.provider.connection.getTokenAccountBalance(vault);
    console.log("Vault: " + vaultAmount.value.amount);
  });

  it('Validate content', async () => {
    contentAccount = await program.account.content.all();
    let theKey = contentAccount[0].publicKey;
    const validate = anchor.web3.Keypair.generate();
    await program.rpc.validateV0(new anchor.BN(1000), {
        accounts: {
            validate: validate.publicKey,
            author: validatorKeypair.publicKey,
            key: theKey,
            validator,
            vault,
            tokenProgram: Spl.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [validate, validatorKeypair],
    });

    const validateAccount = await program.account.validate.fetch(validate.publicKey);
    console.log("Validate Content Key: " + validateAccount.key);
    console.log("Validate Amount: " + validateAccount.amount);
    console.log("Validate Author: " + validateAccount.author);
    console.log("Validate Timestamp: " + validateAccount.timestamp);

    const vaultAmount = await program.provider.connection.getTokenAccountBalance(vault);
    console.log("Vault: " + vaultAmount.value.amount);
  });

});