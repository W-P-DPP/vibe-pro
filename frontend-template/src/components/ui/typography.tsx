import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

function TypographyH1({
  className,
  ...props
}: ComponentPropsWithoutRef<'h1'>) {
  return (
    <h1
      className={cn(
        'scroll-m-20 text-4xl font-extrabold tracking-tight text-balance lg:text-5xl',
        className,
      )}
      {...props}
    />
  )
}

function TypographyH2({
  className,
  ...props
}: ComponentPropsWithoutRef<'h2'>) {
  return (
    <h2
      className={cn(
        'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0',
        className,
      )}
      {...props}
    />
  )
}

function TypographyH3({
  className,
  ...props
}: ComponentPropsWithoutRef<'h3'>) {
  return (
    <h3
      className={cn('scroll-m-20 text-2xl font-semibold tracking-tight', className)}
      {...props}
    />
  )
}

function TypographyH4({
  className,
  ...props
}: ComponentPropsWithoutRef<'h4'>) {
  return (
    <h4
      className={cn('scroll-m-20 text-xl font-semibold tracking-tight', className)}
      {...props}
    />
  )
}

function TypographyP({
  className,
  ...props
}: ComponentPropsWithoutRef<'p'>) {
  return <p className={cn('leading-7 [&:not(:first-child)]:mt-6', className)} {...props} />
}

function TypographyBlockquote({
  className,
  ...props
}: ComponentPropsWithoutRef<'blockquote'>) {
  return (
    <blockquote
      className={cn('mt-6 border-l-2 pl-6 italic', className)}
      {...props}
    />
  )
}

function TypographyInlineCode({
  className,
  ...props
}: ComponentPropsWithoutRef<'code'>) {
  return (
    <code
      className={cn(
        'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
        className,
      )}
      {...props}
    />
  )
}

function TypographyLead({
  className,
  ...props
}: ComponentPropsWithoutRef<'p'>) {
  return <p className={cn('text-xl text-muted-foreground', className)} {...props} />
}

function TypographyLarge({
  className,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('text-lg font-semibold', className)} {...props} />
}

function TypographySmall({
  className,
  ...props
}: ComponentPropsWithoutRef<'small'>) {
  return (
    <small className={cn('text-sm leading-none font-medium', className)} {...props} />
  )
}

function TypographyMuted({
  className,
  ...props
}: ComponentPropsWithoutRef<'p'>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export {
  TypographyBlockquote,
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyInlineCode,
  TypographyLarge,
  TypographyLead,
  TypographyMuted,
  TypographyP,
  TypographySmall,
}



