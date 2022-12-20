import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Gopulse } from "../target/types/gopulse";
import * as assert from "assert";
import { PublicKey } from '@solana/web3.js'

describe("gopulse", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Gopulse as Program<Gopulse>;

  let poster = null;
  let posterKeypair = null;
  let vault = null;
  let vaultKeypair = null;
  let validatorKeypair = null;
  let validatorKeypair1 = null;
  let contentAccount = null;

  it("Initialize test state", async () => {

    vaultKeypair = await anchor.web3.Keypair.generate();
    console.log("Created Vault: " + vaultKeypair.publicKey);

    posterKeypair = await anchor.web3.Keypair.generate();
    const signature2 = await program.provider.connection.requestAirdrop(posterKeypair.publicKey, 100000000000);
    await program.provider.connection.confirmTransaction(signature2);
    console.log("Created Poster: " + posterKeypair.publicKey);

    const getPosterBalance = await program.provider.connection.getBalance(posterKeypair.publicKey);
    console.log("Poster Balance: " + getPosterBalance);
  });

  it('Post new content', async () => {
    const [contentPDA, _] = await PublicKey.findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode('content'),
          posterKeypair.publicKey.toBuffer(),
        ],
        program.programId
      )
        await program.rpc.postV0('content link', new anchor.BN(11000000000), new anchor.BN(9), {
            accounts: {
                content: contentPDA,
                author: posterKeypair.publicKey,
                vaultKeypair: vaultKeypair.publicKey,
                poster,
                vault,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [posterKeypair],
        });

    // Fetch the account details of the created content.
    contentAccount = await program.account.content.fetch(contentPDA);
    console.log("Content Publickey: " + contentPDA.toString());

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

      for (let index = 0; index < 5; index++) {

    validatorKeypair1 = await anchor.web3.Keypair.generate();
    const signature4 = await program.provider.connection.requestAirdrop(validatorKeypair1.publicKey, 100000000000);
    await program.provider.connection.confirmTransaction(signature4);
    console.log("Created Validator: " + validatorKeypair1.publicKey);

    const [validatePDA, _] = await PublicKey.findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode('validate'),
          validatorKeypair1.publicKey.toBuffer(),
        ],
        program.programId
      )

        await program.rpc.validateV0(new anchor.BN(17000000000), "long", {
            accounts: {
                validate: validatePDA,
                author: validatorKeypair1.publicKey,
                vaultKeypair: vaultKeypair.publicKey,
                key: theKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [validatorKeypair1],
        });
    
        const validateAccount = await program.account.validate.fetch(validatePDA);
        console.log("Validate Content Key: " + validateAccount.key);
        console.log("Validate Amount: " + validateAccount.amount);
        console.log("Validate Author: " + validateAccount.author);
        console.log("Validate Count: " + validateAccount.count);
        console.log("Validate Position: " + validateAccount.position);
        console.log("Validate Timestamp: " + validateAccount.timestamp);
        
        let contentAccount1 = await program.account.content.fetch(theKey);
        console.log("Content Validator Count: " + contentAccount1.validatorCount);
        console.log("Content Total Pool: " + contentAccount1.totalPool);
        console.log("Content Long Pool: " + contentAccount1.longPool);
        console.log("Content Short Pool: " + contentAccount1.shortPool);
        console.log("Content Long Win: " + contentAccount1.longWin);
        console.log("Content Short Win: " + contentAccount1.shortWin);
        console.log("Content Validator Reached: " + contentAccount1.validatorThresholdReached);
    
        const getValidatorBalance = await program.provider.connection.getBalance(validatorKeypair1.publicKey);
        const getVaultBalance = await program.provider.connection.getBalance(vaultKeypair.publicKey);
    
        console.log("Poster Balance: " + getValidatorBalance);
        console.log("Vault Balance: " + getVaultBalance);
        console.log("----------------------------------------------------------------------");
      }

      for (let index = 0; index < 4; index++) {

        validatorKeypair = await anchor.web3.Keypair.generate();
        const signature4 = await program.provider.connection.requestAirdrop(validatorKeypair.publicKey, 100000000000);
        await program.provider.connection.confirmTransaction(signature4);
        console.log("Created Validator: " + validatorKeypair.publicKey);
    
        const [validatePDA, _] = await PublicKey.findProgramAddress(
            [
              anchor.utils.bytes.utf8.encode('validate'),
              validatorKeypair.publicKey.toBuffer(),
            ],
            program.programId
          )
        await program.rpc.validateV0(new anchor.BN(14000000000), "short", {
            accounts: {
                validate: validatePDA,
                author: validatorKeypair.publicKey,
                vaultKeypair: vaultKeypair.publicKey,
                key: theKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [validatorKeypair],
        });
    
        const validateAccount = await program.account.validate.fetch(validatePDA);
        console.log("Validate Content Key: " + validateAccount.key);
        console.log("Validate Amount: " + validateAccount.amount);
        console.log("Validate Author: " + validateAccount.author);
        console.log("Validate Count: " + validateAccount.count);
        console.log("Validate Position: " + validateAccount.position);
        console.log("Validate Timestamp: " + validateAccount.timestamp);
        
        let contentAccount1 = await program.account.content.fetch(theKey);
        console.log("Content Validator Count: " + contentAccount1.validatorCount);
        console.log("Content Total Pool: " + contentAccount1.totalPool);
        console.log("Content Long Pool: " + contentAccount1.longPool);
        console.log("Content Short Pool: " + contentAccount1.shortPool);
        console.log("Content Long Win: " + contentAccount1.longWin);
        console.log("Content Short Win: " + contentAccount1.shortWin);
        console.log("Content Validator Reached: " + contentAccount1.validatorThresholdReached);
    
        const getValidatorBalance = await program.provider.connection.getBalance(validatorKeypair.publicKey);
        const getVaultBalance = await program.provider.connection.getBalance(vaultKeypair.publicKey);
    
        console.log("Poster Balance: " + getValidatorBalance);
        console.log("Vault Balance: " + getVaultBalance);
        console.log("----------------------------------------------------------------------");
      }
  });

  it("Collects the reward", async () => {
    
    contentAccount = await program.account.content.all();
    let theKey = contentAccount[0].publicKey;

    const [validatePDA, _] = await PublicKey.findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode('validate'),
          validatorKeypair1.publicKey.toBuffer(),
        ],
        program.programId
      )
    await program.rpc.collectV0({
        accounts: {
            validate: validatePDA,
            author: validatorKeypair1.publicKey,
            vaultKeypair: vaultKeypair.publicKey,
            key: theKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [validatorKeypair1],
    });
  });

});