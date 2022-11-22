use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod gopulse {
    use super::*;

    pub fn post_v0(ctx: Context<PostContent>, title: String, essay: String, amount: u64) -> Result<()> {
        let content: &mut Account<Content> = &mut ctx.accounts.content;
        let author: &Signer = &ctx.accounts.author;
        // let accounts = &ctx.remaining_accounts;
        let clock: Clock = Clock::get().unwrap();
        
        if title.chars().count() < 1 {
            return Err(ErrorCode::TitleRequired.into())
        }

        if title.chars().count() > 50 {
            return Err(ErrorCode::TitleTooLong.into())
        }

        if essay.chars().count() > 280 {
            return Err(ErrorCode::ReviewTooLong.into())
        }

        content.author = *author.key;
        content.timestamp = clock.unix_timestamp;
        content.title = title;
        content.essay = essay;
        content.amount = amount;

        let cpi_accounts = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.author.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;

        // let authors: usize = author_keys.len();
        // let tokenDistribution: usize = 1/authors;

        // for address in author_keys {
        //     token::transfer (address: Pubkey, tokenDistribution: usize)?;
        // }

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
    pub title: String,
    pub essay: String,
    pub amount: u64,
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
    #[msg("The provided title should be 50 characters long maximum.")]
    TitleTooLong,
    #[msg("The provided review should be 280 characters long maximum.")]
    ReviewTooLong,
    #[msg("Topic Required.")]
    TitleRequired,
}