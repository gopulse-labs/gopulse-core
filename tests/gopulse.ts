import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Gopulse } from "../target/types/gopulse";
import * as assert from "assert";
import { PublicKey } from '@solana/web3.js'

describe("gopulse", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Gopulse as Program<Gopulse>;

  let posterKeypair = null;
  let validatorKeypair = null;
  let validatorKeypair1 = null;
  let contentAccount = null;
  let contentLink = "content link";
  let topic = "topic";

  it("Initialize test state", async () => {
    posterKeypair = await anchor.web3.Keypair.generate();
    const signature2 = await program.provider.connection.requestAirdrop(posterKeypair.publicKey, 100000000000);
    await program.provider.connection.confirmTransaction(signature2);
    console.log("Created Poster: " + posterKeypair.publicKey);

    const getPosterBalance = await program.provider.connection.getBalance(posterKeypair.publicKey);
    console.log("Poster Balance: " + getPosterBalance);
  });

  it('Post Content', async () => {

    let postCounter = 32;
    
    const [contentPDA] = await PublicKey.findProgramAddress(
        [
          new anchor.BN(postCounter).toArrayLike(Buffer, "le", 8),
          posterKeypair.publicKey.toBuffer(),
        ],
        program.programId
      )

      console.log(contentPDA.toString())

    const [vaultPDA] = await PublicKey.findProgramAddress(
        [
            anchor.utils.bytes.utf8.encode('vault'),
            contentPDA.toBuffer(),
        ],
        program.programId
      )
    
    await program.rpc.postV0(contentLink, topic, new anchor.BN(2000000000), new anchor.BN(9), new anchor.BN(postCounter), {
        accounts: {
            content: contentPDA,
            poster: posterKeypair.publicKey,
            vault: vaultPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [posterKeypair],
    });

    // Fetch the account details of the created content.
    contentAccount = await program.account.content.fetch(contentPDA);
    console.log("Content Publickey: " + contentPDA.toString());

    const getPosterBalance = await program.provider.connection.getBalance(posterKeypair.publicKey);
    const getVaultBalance = await program.provider.connection.getBalance(vaultPDA);

    console.log("Poster Balance: " + getPosterBalance);
    console.log("Vault Balance: " + getVaultBalance);

    // Ensure it has the right data.
    assert.equal(contentAccount.poster.toBase58(), posterKeypair.publicKey.toBase58());
    assert.equal(contentAccount.contentLink, 'content link');
    assert.ok(contentAccount.timestamp);
    
    console.log("Content Poster: " + contentAccount.poster);
    console.log("Content Timestamp: " + contentAccount.timestamp);
    console.log("Content Link: " + contentAccount.contentLink);
    console.log("Content Amount: " + contentAccount.amount);
    console.log("Content Topic: " + contentAccount.topic);
    console.log("Content Counter: " + contentAccount.postCounter);
    console.log("Content Validator Count: " + contentAccount.validatorCount);
    console.log("Content Validator Threshold: " + contentAccount.validatorThreshold);

  });

  it('Validate Content', async () => {
    
    contentAccount = await program.account.content.all();
    const theKey = contentAccount[0].publicKey;
    const contentpc = await program.account.content.fetch(theKey);

    const postCounter = contentpc.postCounter.toString();
    console.log("postCounter: " + postCounter);

      for (let index = 0; index < 5; index++) {

        validatorKeypair1 = await anchor.web3.Keypair.generate();
        const signature4 = await program.provider.connection.requestAirdrop(validatorKeypair1.publicKey, 100000000000);
        await program.provider.connection.confirmTransaction(signature4);
        console.log("Created Validator: " + validatorKeypair1.publicKey);

        const [contentPDA] = await PublicKey.findProgramAddress(
            [
            new anchor.BN(postCounter).toArrayLike(Buffer, "le", 8),
              posterKeypair.publicKey.toBuffer(),
            ],
            program.programId
          )

        const [validatePDA] = await PublicKey.findProgramAddress(
            [
            contentPDA.toBuffer(),
            validatorKeypair1.publicKey.toBuffer(),
            ],
            program.programId
          )

        const [vaultPDA] = await PublicKey.findProgramAddress(
            [
            anchor.utils.bytes.utf8.encode('vault'),
            contentPDA.toBuffer(),
            ],
            program.programId
          )

        await program.rpc.validateV0(new anchor.BN(1000000000), "long", {
            accounts: {
                validate: validatePDA,
                validator: validatorKeypair1.publicKey,
                vault: vaultPDA,
                poster: posterKeypair.publicKey,
                content: theKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [validatorKeypair1],
        });
    
        const validateAccount = await program.account.validate.fetch(validatePDA);
        console.log("Validate Content Key: " + validateAccount.content);
        console.log("Validate Amount: " + validateAccount.amount);
        console.log("Validate Validator: " + validateAccount.validator);
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
        const getVaultBalance = await program.provider.connection.getBalance(vaultPDA);
    
        console.log("Poster Balance: " + getValidatorBalance);
        console.log("Vault Balance: " + getVaultBalance);
        console.log("----------------------------------------------------------------------");
      }

      for (let index = 0; index < 4; index++) {

        validatorKeypair = await anchor.web3.Keypair.generate();
        const signature4 = await program.provider.connection.requestAirdrop(validatorKeypair.publicKey, 100000000000);
        await program.provider.connection.confirmTransaction(signature4);
        console.log("Created Validator: " + validatorKeypair.publicKey);

        const [contentPDA] = await PublicKey.findProgramAddress(
            [
              new anchor.BN(postCounter).toArrayLike(Buffer, "le", 8),
              posterKeypair.publicKey.toBuffer(),
            ],
            program.programId
          )
    
        const [validatePDA] = await PublicKey.findProgramAddress(
            [
              contentPDA.toBuffer(),
              validatorKeypair.publicKey.toBuffer(),
            ],
            program.programId
          )
        
        const [vaultPDA] = await PublicKey.findProgramAddress(
            [
              anchor.utils.bytes.utf8.encode('vault'),
              contentPDA.toBuffer(),
            ],
            program.programId
          )
    
        await program.rpc.validateV0(new anchor.BN(1000000000), "short", {
            accounts: {
                validate: validatePDA,
                validator: validatorKeypair.publicKey,
                vault: vaultPDA,
                poster: posterKeypair.publicKey,
                content: theKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [validatorKeypair],
        });
    
        const validateAccount = await program.account.validate.fetch(validatePDA);
        console.log("Validate Content Key: " + validateAccount.content);
        console.log("Validate Amount: " + validateAccount.amount);
        console.log("Validate Validator: " + validateAccount.validator);
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
        const getVaultBalance = await program.provider.connection.getBalance(vaultPDA);
    
        console.log("Poster Balance: " + getValidatorBalance);
        console.log("Vault Balance: " + getVaultBalance);
        console.log("----------------------------------------------------------------------");
      }
  });

  it("Poster Dispersement", async () => {
    
    contentAccount = await program.account.content.all();
    let theKey = contentAccount[0].publicKey;
    const contentpc = await program.account.content.fetch(theKey);

    const postCounter = contentpc.postCounter.toString();
    console.log("postCounter: " + postCounter);

    const [contentPDA] = await PublicKey.findProgramAddress(
        [
          new anchor.BN(postCounter).toArrayLike(Buffer, "le", 8),
          posterKeypair.publicKey.toBuffer(),
        ],
        program.programId
      )

    const [vaultPDA] = await PublicKey.findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode('vault'),
          contentPDA.toBuffer(),
        ],
        program.programId
      )

    const getPosterBalance = await program.provider.connection.getBalance(posterKeypair.publicKey);
    const getVaultBalance2 = await program.provider.connection.getBalance(vaultPDA)

    console.log("Poster Pre Balance: " + getPosterBalance);
    console.log("Vault Pre Balance: " + getVaultBalance2);

    await program.rpc.posterCollectV0({
        accounts: {
            poster: posterKeypair.publicKey,
            vault: vaultPDA,
            content: theKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [posterKeypair],
    });

    const getPosterBalance1 = await program.provider.connection.getBalance(posterKeypair.publicKey);
    const getVaultBalance3 = await program.provider.connection.getBalance(vaultPDA)

    console.log("Poster Post Balance: " + getPosterBalance1);
    console.log("Vault Post Balance: " + getVaultBalance3);

    let contentAccount1 = await program.account.content.fetch(contentPDA);
    console.log("Content Dispersed: " + contentAccount1.dispersed);
    console.log("Content Disbursement: " + contentAccount1.dispersement);

  });

  it("Validator Dispersement", async () => {
    
    contentAccount = await program.account.content.all();
    let theKey = contentAccount[0].publicKey;
    const contentpc = await program.account.content.fetch(theKey);

    const postCounter = contentpc.postCounter.toString();
    console.log("postCounter: " + postCounter);

    const [contentPDA] = await PublicKey.findProgramAddress(
        [
          new anchor.BN(postCounter).toArrayLike(Buffer, "le", 8),
          posterKeypair.publicKey.toBuffer(),
        ],
        program.programId
      )

    const [vaultPDA] = await PublicKey.findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode('vault'),
          contentPDA.toBuffer(),
        ],
        program.programId
      )

    const [validatePDA] = await PublicKey.findProgramAddress(
        [
          contentPDA.toBuffer(),
          validatorKeypair1.publicKey.toBuffer(),
        ],
        program.programId
      )

    const getValidatorBalance = await program.provider.connection.getBalance(validatorKeypair1.publicKey);
    const getVaultBalance = await program.provider.connection.getBalance(vaultPDA);

    let contentAccount1 = await program.account.content.fetch(contentPDA);
    console.log("Content Validator Count: " + contentAccount1.validatorCount);
    console.log("Content Total Pool: " + contentAccount1.totalPool);
    console.log("Content Long Pool: " + contentAccount1.longPool);
    console.log("Content Short Pool: " + contentAccount1.shortPool);
    console.log("Content Long Win: " + contentAccount1.longWin);
    console.log("Content Short Win: " + contentAccount1.shortWin);
    console.log("Content Validator Reached: " + contentAccount1.validatorThresholdReached);

    const validateAccount = await program.account.validate.fetch(validatePDA);
    console.log("Validate Content Key: " + validateAccount.content);
    console.log("Validate Amount: " + validateAccount.amount);
    console.log("Validate Author: " + validateAccount.validator);
    console.log("Validate Count: " + validateAccount.count);
    console.log("Validate Position: " + validateAccount.position);
    console.log("Validate Timestamp: " + validateAccount.timestamp);

    console.log("Validator Pre Balance: " + getValidatorBalance);
    console.log("Vault Pre Balance: " + getVaultBalance);

    await program.rpc.validatorCollectV0({
        accounts: {
            validate: validatePDA,
            validator: validatorKeypair1.publicKey,
            vault: vaultPDA,
            content: theKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [validatorKeypair1],
    });

    const getValidatorBalance1 = await program.provider.connection.getBalance(validatorKeypair1.publicKey);
    const getVaultBalance1 = await program.provider.connection.getBalance(vaultPDA)

    console.log("Validator Post Balance: " + getValidatorBalance1);
    console.log("Vault Post Balance: " + getVaultBalance1);

    const validateAccount1 = await program.account.validate.fetch(validatePDA);
    console.log("Validate Content Key: " + validateAccount1.content);
    console.log("Validate Amount: " + validateAccount1.amount);
    console.log("Validate Disbursed: " + validateAccount1.dispersed);
    console.log("Validate Disbursment: " + validateAccount1.dispersement);
    console.log("Validate Author: " + validateAccount1.validator);
    console.log("Validate Count: " + validateAccount1.count);
    console.log("Validate Position: " + validateAccount1.position);
    console.log("Validate Timestamp: " + validateAccount1.timestamp);
  });

  it("Create new user", async () => {

    const [profilePDA] = await PublicKey.findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode('profile'),
          posterKeypair.publicKey.toBuffer(),
        ],
        program.programId
      )

    const name = "user name";
    const avatar = "https://img.link";

    await program.rpc.signupUserV0(name, avatar, {
            accounts: {
                authority: posterKeypair.publicKey,
                userAccount: profilePDA,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [posterKeypair],
    });

    const user = await program.account.userState.fetch(profilePDA);
    console.log("User Account: " + user.authority)
    console.log("User Name: " + user.name)
    console.log("User Avatar: " + user.avatar)
  });

  it("Update user", async () => {

    const [profilePDA] = await PublicKey.findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode('profile'),
          posterKeypair.publicKey.toBuffer(),
        ],
        program.programId
      )

    const name = "user name 1";
    const avatar = "https://img.link1";

    await program.rpc.updateUserV0(name, avatar, {
            accounts: {
                authority: posterKeypair.publicKey,
                userAccount: profilePDA,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [posterKeypair],
    });

    const user = await program.account.userState.fetch(profilePDA);
    console.log("User Account: " + user.authority)
    console.log("User Name: " + user.name)
    console.log("User Avatar: " + user.avatar)
  });

});