use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod gopulse {
    use super::*;

    pub fn post_v0(ctx: Context<PostContent>, content_link: String, amount: u64, validator_threshold: u64) -> Result<()> {
        let content: &mut Account<Content> = &mut ctx.accounts.content;
        let author: &Signer = &ctx.accounts.author;
        // let accounts = &ctx.remaining_accounts;
        let clock: Clock = Clock::get().unwrap();
        
        if content_link.chars().count() < 1 {
            return Err(ErrorCode::ContentRequired.into())
        }

        if amount > 10000 {
            return Err(ErrorCode::StakeToLarge.into())
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

        //transfer staked GPT to vault

        let cpi_accounts = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.author.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;

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
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Content {
    pub author: Pubkey,
    pub timestamp: i64,
    pub content_link: String,
    pub amount: u64,
    pub validator_threshold: u64,
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

#[error_code]
pub enum ErrorCode {
    #[msg("Content link Required")]
    ContentRequired,
    #[msg("Cannot stake more than 10,000 GPT")]
    StakeToLarge,
    #[msg("Validator Threshold must be odd")]
    ThresholdEven,
    #[msg("Validator Threshold must be 51 or greater")]
    ThresholdTooSmall,
}