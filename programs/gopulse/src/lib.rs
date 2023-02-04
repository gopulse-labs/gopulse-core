use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("3tMVmtunb5Z73Gqo6EKCKCzCMJkTA5JkALdF6hLjdWWn");

#[program]
pub mod gopulse {
    use super::*;

    pub fn post_v0(ctx: Context<PostContent>, content_link: String, 
        amount: f64, validator_threshold: i64) -> Result<()> {

        let content: &mut Account<Content> = &mut ctx.accounts.content;
        let poster: &Signer = &ctx.accounts.poster;
        let clock: Clock = Clock::get().unwrap();
        
        if content_link.chars().count() < 1 {
            return Err(ErrorCode::ContentRequired.into())   
        }

        if validator_threshold % 2 == 0 {
            return Err(ErrorCode::ThresholdEven.into())
        }

        if validator_threshold < 7 {
            return Err(ErrorCode::ThresholdTooSmall.into())
        }

        content.poster = *poster.key;
        content.timestamp = clock.unix_timestamp;
        content.content_link = content_link;
        content.amount = amount;
        content.validator_threshold = validator_threshold;
        content.total_pool = 0.0;
        content.long_pool = 0.0;
        content.short_pool = 0.0;
        content.validator_count = 0;
        content.validator_threshold_reached = false;
        content.long_win = false;
        content.short_win = false;
        content.dispersed = false;
        content.dispersement = 0.0;

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(), 
            system_program::Transfer {
                from: ctx.accounts.poster.to_account_info(),
                to: ctx.accounts.vault.clone(),
            });
        system_program::transfer(cpi_context, amount as u64)?;

        Ok(())
    }

    pub fn validate_v0(ctx: Context<ValidateContent>, amount: f64, position: String) -> Result<()> {

        let validate: &mut Account<Validate> = &mut ctx.accounts.validate;
        let validator: &Signer = &ctx.accounts.validator;
        let clock: Clock = Clock::get().unwrap();

        validate.validator = *validator.key;
        validate.timestamp = clock.unix_timestamp;
        validate.amount = amount;
        validate.dispersed = false;
        validate.dispersement = 0.0;
        validate.position = position;
        validate.content = ctx.accounts.content.key();

        let content: &mut Account<Content> = &mut ctx.accounts.content;
        content.validator_count += 1;
        validate.count = content.validator_count;
        content.total_pool += amount as f64;

        if validate.position == "long" {
            content.long_pool += amount;
        }

        if validate.position == "short" {
            content.short_pool += amount;
        }

        if content.validator_threshold_reached == true {
            return Err(ErrorCode::ThresholdReached.into())
        }

        if validate.count >= content.validator_threshold {
            content.validator_threshold_reached = true;
            if content.short_pool > content.long_pool {
                content.short_win = true;
            }
            else if content.long_pool > content.short_pool {
                content.long_win = true;
            }
        }
     
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(), 
            system_program::Transfer {
                from: ctx.accounts.validator.to_account_info(),
                to: ctx.accounts.vault.clone(),
            });
        system_program::transfer(cpi_context, amount as u64)?;

        Ok(())
    }

    pub fn poster_collect_v0(ctx: Context<PosterCollect>) -> Result<()> {

        let content: &mut Account<Content> = &mut ctx.accounts.content;

        if content.long_win == true {
            let percentage = content.amount / content.long_pool;
            let dispersement = content.short_pool * percentage;

            content.dispersed = true;
            content.dispersement = dispersement;
    
            **ctx.accounts.vault.try_borrow_mut_lamports()? -= dispersement as u64;
            **ctx.accounts.poster.try_borrow_mut_lamports()? += dispersement as u64;
        }

        Ok(())
    }

    pub fn validator_collect_v0(ctx: Context<ValidatorCollect>) -> Result<()> {

        let content: &mut Account<Content> = &mut ctx.accounts.content;
        let validate: &mut Account<Validate> = &mut ctx.accounts.validate;

        if content.long_win == true && validate.position == "long" {
            let percentage = validate.amount / content.long_pool;
            let dispersement = content.short_pool * percentage;
    
            validate.dispersement = dispersement;
            validate.dispersed = true;
                
            **ctx.accounts.vault.try_borrow_mut_lamports()? -= dispersement as u64;
            **ctx.accounts.validator.try_borrow_mut_lamports()? += dispersement as u64;
        }

        if content.short_win == true && validate.position == "short" {
            let percentage = validate.amount / content.short_pool;
            let dispersement = content.long_pool * percentage;
    
            validate.dispersement = dispersement;
            validate.dispersed = true;
                
            **ctx.accounts.vault.try_borrow_mut_lamports()? -= dispersement as u64;
            **ctx.accounts.validator.try_borrow_mut_lamports()? += dispersement as u64;
        }

        Ok(())
    }

}

#[derive(Accounts)]
#[instruction(content_link: String)]
pub struct PostContent<'info> {
    #[account(init, payer = poster, space = Content::LEN, seeds = [content_link.as_bytes().as_ref(), poster.key().as_ref()], bump)]
    pub content: Account<'info, Content>,
    #[account(mut)]
    pub poster: Signer<'info>,
    #[account(init, payer = poster, space = Content::LEN, seeds = [b"vault", content.key().as_ref()], bump)]
    /// CHECK: This is not dangerous because we just pay to this account
    pub vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ValidateContent<'info> {
    #[account(init, payer = validator, space = Validate::LEN, seeds = [b"validate", validator.key().as_ref()], bump)]
    pub validate: Account<'info, Validate>,
    #[account(mut)]
    pub validator: Signer<'info>, 
    #[account(mut)]
    pub content: Account<'info, Content>,
    #[account(mut)]
    /// CHECK:
    poster: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK: This is not dangerous because we just pay to this account
    pub vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ValidatorCollect<'info> {
    #[account(mut)]
    pub validate: Account<'info, Validate>,
    #[account(mut)]
    pub validator: Signer<'info>, 
    #[account(mut)]
    pub content: Account<'info, Content>,
    #[account(mut)]
    /// CHECK: This is not dangerous because we just pay to this account
    pub vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PosterCollect<'info> {
    #[account(mut)]
    pub poster: Signer<'info>, 
    #[account(mut)]
    pub content: Account<'info, Content>,
    #[account(mut)]
    /// CHECK: This is not dangerous because we just pay to this account
    pub vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Content {
    pub poster: Pubkey,
    pub timestamp: i64,
    pub content_link: String,
    pub amount: f64,
    pub total_pool: f64,
    pub short_pool: f64,
    pub long_pool: f64,
    pub short_win: bool,
    pub long_win: bool,
    pub validator_threshold: i64,
    pub validator_count: i64,
    pub validator_threshold_reached: bool,
    pub dispersement: f64,
    pub dispersed: bool,
}

#[account]
pub struct Validate {
    pub validator: Pubkey,
    pub content: Pubkey,
    pub timestamp: i64,
    pub amount: f64,
    pub dispersement: f64,
    pub dispersed: bool,
    pub count: i64,
    pub position: String,
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
        + PUBLIC_KEY_LENGTH // Verifier.
        + STRING_LENGTH_PREFIX + MAX_CONTENT_LENGTH;
        
}

#[error_code]
pub enum ErrorCode {
    #[msg("Content link Required")]
    ContentRequired,
    #[msg("Validator Threshold must be odd")]
    ThresholdEven,
    #[msg("Validator Threshold must be 51 or greater")]
    ThresholdTooSmall,
    #[msg("Validator Threshold has been reached")]
    ThresholdReached,
    #[msg("No Dispersement Available")]
    NoDispersement,
}