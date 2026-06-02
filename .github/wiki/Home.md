# FPL Auction Hub

Welcome to the **FPL Auction Hub** wiki — your complete guide to setting up, using, and contributing to the Fantasy Premier League auction draft manager.

## What is FPL Auction Hub?

FPL Auction Hub is a web application that transforms the traditional Fantasy Premier League experience into an **auction-style draft system**. Instead of picking players freely within a budget, managers **bid against each other** in real-time live auctions to build their squads.

Built with **Next.js**, **Supabase**, and **TypeScript**, it provides a seamless, real-time auction experience with:

- **Live bidding** — real-time auction rooms with countdown timers
- **Player valuation** — a weighted index builder to calculate player values
- **Squad management** — pitch visualizations for all teams in your league
- **FPL data integration** — live player stats, prices, fixtures, and more

## Quick Links

| Page | Description |
|---|---|
| [Getting Started](Getting-Started) | Installation and setup guide |
| [Features](Features) | Complete feature overview |
| [Auction System](Auction-System) | How the live auction works |
| [Architecture](Architecture) | Technical architecture overview |
| [Database Schema](Database) | Supabase tables and relationships |
| [FPL Data Integration](FPL-Data) | How FPL API data is fetched and used |
| [Development Guide](Development) | Contributing and development workflow |
| [Deployment](Deployment) | Deploying to production |

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **Database & Auth**: Supabase (PostgreSQL, Row-Level Security)
- **Real-time**: Supabase Realtime Channels
- **UI**: shadcn/ui + Tailwind CSS v4
- **Language**: TypeScript (strict mode)
- **Hosting**: Vercel

## Prerequisites

- Node.js 18+
- A Supabase account (free tier works)
- A Vercel account (for deployment)
