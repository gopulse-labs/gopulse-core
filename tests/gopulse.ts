import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Gopulse } from "../target/types/gopulse";
import * as assert from "assert";

describe("gopulse", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Gopulse as Program<Gopulse>;

  let poster = null;
  let posterKeypair = null;
  let vault = null;
  let vaultKeypair = null;
  let validatorKeypair = null;
  let contentAccount = null;
  let content = null;

  it("Initialize test state", async () => {

    vaultKeypair = await anchor.web3.Keypair.generate();
    console.log("Created Vault: " + vaultKeypair.publicKey);

    posterKeypair = await anchor.web3.Keypair.generate();
    const signature2 = await program.provider.connection.requestAirdrop(posterKeypair.publicKey, 1000000000);
    await program.provider.connection.confirmTransaction(signature2);
    console.log("Created Poster: " + posterKeypair.publicKey);

    const getPosterBalance = await program.provider.connection.getBalance(posterKeypair.publicKey);
    console.log("Poster Balance: " + getPosterBalance);

    validatorKeypair = await anchor.web3.Keypair.generate();
    const signature4 = await program.provider.connection.requestAirdrop(validatorKeypair.publicKey, 1000000000);
    await program.provider.connection.confirmTransaction(signature4);
    console.log("Created Validator: " + validatorKeypair.publicKey);

    const getValidatorBalance = await program.provider.connection.getBalance(validatorKeypair.publicKey);
    console.log("Validator Balance: " + getValidatorBalance);
  });

  content = anchor.web3.Keypair.generate();

  it('Post new content', async () => {
    // content = anchor.web3.Keypair.generate();
        await program.rpc.postV0('content link', new anchor.BN(17000000), new anchor.BN(17), {
            accounts: {
                content: content.publicKey,
                author: posterKeypair.publicKey,
                vaultKeypair: vaultKeypair.publicKey,
                poster,
                vault,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [content, posterKeypair],
        });

    // Fetch the account details of the created content.
    contentAccount = await program.account.content.fetch(content.publicKey);
    console.log("Content Publickey: " + content.publicKey.toString());

    const getPosterBalance = await program.provider.connection.getBalance(posterKeypair.publicKey);
    const getVaultBalance = await program.provider.connection.getBalance(vaultKeypair.publicKey);

    console.log("Poster Balance: " + getPosterBalance);
    console.log("Vault Balance: " + getVaultBalance);

    // Ensure it has the right data.
    assert.equal(contentAccount.author.toBase58(), posterKeypair.publicKey.toBase58());
    assert.equal(contentAccount.contentLink, 'content link');
    assert.ok(contentAccount.timestamp);
    
    console.log("Content Author: " + contentAccount.author);
    console.log("Content Timestamp: " + contentAccount.timestamp);
    console.log("Content Link: " + contentAccount.contentLink);
    console.log("Content Amount: " + contentAccount.amount);
    console.log("Content Validator Count: " + contentAccount.validatorCount);
    console.log("Content Validator Threshold: " + contentAccount.validatorThreshold);

  });

  it('Validate content', async () => {
    contentAccount = await program.account.content.all();
    let theKey = contentAccount[0].publicKey;

    let theVec = [];

      for (let index = 0; index < 4; index++) {

        // let contentAccounts = await program.account.validate.all();
        // console.log(contentAccounts);
        const validate = anchor.web3.Keypair.generate();
        // theVec.push(validate.publicKey);
        await program.rpc.validateV0(new anchor.BN(17000000), "long", {
            accounts: {
                validate: validate.publicKey,
                author: validatorKeypair.publicKey,
                vaultKeypair: vaultKeypair.publicKey,
                key: theKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            remainingAccounts: theVec,
            signers: [validate, validatorKeypair],
        });
    
        const validateAccount = await program.account.validate.fetch(validate.publicKey);
        console.log("Validate Content Key: " + validateAccount.key);
        console.log("Validate Amount: " + validateAccount.amount);
        console.log("Validate Author: " + validateAccount.author);
        console.log("Validate Count: " + validateAccount.count);
        console.log("Validate Position: " + validateAccount.position);
        console.log("Validate Timestamp: " + validateAccount.timestamp);
        
        let contentAccount1 = await program.account.content.fetch(content.publicKey);
        console.log("Content Validator Count: " + contentAccount1.validatorCount);
        console.log("Content Validator Reached: " + contentAccount1.validatorThresholdReached);
    
        const getValidatorBalance = await program.provider.connection.getBalance(validatorKeypair.publicKey);
        const getVaultBalance = await program.provider.connection.getBalance(vaultKeypair.publicKey);
    
        console.log("Poster Balance: " + getValidatorBalance);
        console.log("Vault Balance: " + getVaultBalance);
      }

      for (let index = 0; index < 4; index++) {
        const validate = anchor.web3.Keypair.generate();
        await program.rpc.validateV0(new anchor.BN(17000000), "short", {
            accounts: {
                validate: validate.publicKey,
                author: validatorKeypair.publicKey,
                vaultKeypair: vaultKeypair.publicKey,
                key: theKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [validate, validatorKeypair],
        });
    
        const validateAccount = await program.account.validate.fetch(validate.publicKey);
        console.log("Validate Content Key: " + validateAccount.key);
        console.log("Validate Amount: " + validateAccount.amount);
        console.log("Validate Author: " + validateAccount.author);
        console.log("Validate Count: " + validateAccount.count);
        console.log("Validate Position: " + validateAccount.position);
        console.log("Validate Timestamp: " + validateAccount.timestamp);
        
        let contentAccount1 = await program.account.content.fetch(content.publicKey);
        console.log("Content Validator Count: " + contentAccount1.validatorCount);
        console.log("Content Validator Reached: " + contentAccount1.validatorThresholdReached);
    
        const getValidatorBalance = await program.provider.connection.getBalance(validatorKeypair.publicKey);
        const getVaultBalance = await program.provider.connection.getBalance(vaultKeypair.publicKey);
    
        console.log("Poster Balance: " + getValidatorBalance);
        console.log("Vault Balance: " + getVaultBalance);
      }
  });

});