use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod gopulse {
    use super::*;

    pub fn post_v0(ctx: Context<PostContent>, content_link: String, amount: u64, validator_threshold: i64) -> Result<()> {
        let content: &mut Account<Content> = &mut ctx.accounts.content;
        let author: &Signer = &ctx.accounts.author;
        // let accounts = &ctx.remaining_accounts;
        let clock: Clock = Clock::get().unwrap();
        
        if content_link.chars().count() < 1 {
            return Err(ErrorCode::ContentRequired.into())  
        }

        if validator_threshold % 2 == 0 {
            return Err(ErrorCode::ThresholdEven.into())
        }

        if validator_threshold < 51 {
            return Err(ErrorCode::ThresholdTooSmall.into())
        }

        content.author = *author.key;
        content.timestamp = clock.unix_timestamp;
        content.content_link = content_link;
        content.amount = amount;
        content.validator_threshold = validator_threshold;
        content.validator_count = 0;
        content.validator_threshold_reached = false;

        //transfer SOL to vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(), 
            system_program::Transfer {
                from: ctx.accounts.author.to_account_info(),
                to: ctx.accounts.vault_keypair.clone(),
            });
        system_program::transfer(cpi_context, amount)?;

        Ok(())
    }

    pub fn validate_v0(ctx: Context<ValidateContent>, amount: u64) -> Result<()> {
        let validate: &mut Account<Validate> = &mut ctx.accounts.validate;
        let author: &Signer = &ctx.accounts.author;
        let clock: Clock = Clock::get().unwrap();

        validate.author = *author.key;
        validate.timestamp = clock.unix_timestamp;
        validate.amount = amount;
        validate.key = ctx.accounts.key.key();

        let content: &mut Account<Content> = &mut ctx.accounts.key;
        let key_count = &mut content.validator_count;
        *key_count += 53;
        validate.count = *key_count;

        let key_threshold = &mut content.validator_threshold;

        if validate.count == *key_threshold {
            let key_threshold_reached = &mut content.validator_threshold_reached;
            *key_threshold_reached = true;
        }

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(), 
            system_program::Transfer {
                from: ctx.accounts.author.to_account_info(),
                to: ctx.accounts.vault_keypair.clone(),
            });
        system_program::transfer(cpi_context, amount)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct PostContent<'info> {
    #[account(init, payer = author, space = Content::LEN)]
    pub content: Account<'info, Content>,
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(mut)]
    /// CHECK: This is not dangerous because we just pay to this account
    pub vault_keypair: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ValidateContent<'info> {
    #[account(init, payer = author, space = Validate::LEN)]
    pub validate: Account<'info, Validate>,
    #[account(mut)]
    pub author: Signer<'info>, 
    #[account(mut)]
    pub key: Account<'info, Content>,
    #[account(mut)]
    /// CHECK: This is not dangerous because we just pay to this account
    pub vault_keypair: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Content {
    pub author: Pubkey,
    pub timestamp: i64,
    pub content_link: String,
    pub amount: u64,
    pub validator_threshold: i64,
    pub validator_count: i64,
    pub validator_threshold_reached: bool,
}

#[account]
pub struct Validate {
    pub author: Pubkey,
    pub key: Pubkey,
    pub timestamp: i64,
    pub amount: u64,
    pub count: i64,
}

const DISCRIMINATOR_LENGTH: usize = 8;
const PUBLIC_KEY_LENGTH: usize = 32;
const TIMESTAMP_LENGTH: usize = 8;
const STRING_LENGTH_PREFIX: usize = 4; // Stores the size of the string.
const MAX_TOPIC_LENGTH: usize = 50 * 4; // 50 chars max.
const MAX_CONTENT_LENGTH: usize = 280 * 4; // 280 chars max.
const REVIEW_LENGTH: usize = 32;

impl Content {
    const LEN: usize = DISCRIMINATOR_LENGTH
        + PUBLIC_KEY_LENGTH // Author.
        + TIMESTAMP_LENGTH // Timestamp.
        + STRING_LENGTH_PREFIX + MAX_TOPIC_LENGTH // Topic.
        + STRING_LENGTH_PREFIX + MAX_CONTENT_LENGTH
        + REVIEW_LENGTH; // Content.
}

impl Validate {
    const LEN: usize = DISCRIMINATOR_LENGTH
        + PUBLIC_KEY_LENGTH // TweetKey.
        + PUBLIC_KEY_LENGTH // TweetKey.
        + TIMESTAMP_LENGTH // Timestamp.
        + PUBLIC_KEY_LENGTH; // Verifier.
}

#[error_code]
pub enum ErrorCode {
    #[msg("Content link Required")]
    ContentRequired,
    #[msg("Validator Threshold must be odd")]
    ThresholdEven,
    #[msg("Validator Threshold must be 51 or greater")]
    ThresholdTooSmall,
}