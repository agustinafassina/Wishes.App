# Building My Travel Bucket List App with Cursor AI: A Journey of Code and Dreams 🗺️

## The Spark: From Recommendation to Reality

A few days ago, a colleague recommended I try an AI-powered IDE or add an AI extension to VSCode to see what the experience was like. That's how I discovered **Cursor** — and I was immediately intrigued.

Fresh off a trip and with an insatiable wanderlust, I decided to combine my passion for travel with testing this new tool. I set out to build something meaningful: a personal travel bucket list application that would help me track my dream of exploring the world.

## The Vision: More Than Just a Checklist

The goal of the app is simple yet beautiful: to follow my dream of completing the most wonderful list of all — **countries to explore**. 

I wanted to create a system that would help me organize my travel aspirations into three clear categories:

- ✅ **Completed**: Countries I've already had the privilege to visit
- ⏳ **In Review**: Countries I'm actively planning or have partially explored
- ○ **Pending**: Countries on my radar, waiting for their moment

But this wasn't just about tracking countries — it was about visualizing my journey, seeing my progress on a map, and making the dream tangible.

## What I Built: Features That Matter

### Interactive World Map
Using Google Maps API, I created an interactive map that displays all the countries I've visited. Each country appears as a marker with its flag, and clicking on it reveals more details.

### Drag-and-Drop Checklist
The heart of the application is a dynamic checklist where I can drag countries between columns. When I move a country from "Pending" to "In Review" or mark it as "Completed," the change is instantly saved — making the app feel responsive and real.

### Progress Tracking
A progress bar shows me exactly how many countries I've visited out of the total 195 countries in the world. It's a visual reminder of how much more there is to explore.

### Add New Countries
Double-clicking any column opens a modal where I can add new countries to my list. The app automatically generates flag URLs and validates the data, making it easy to expand my bucket list.

## The Tech Stack: Keeping It Simple

For this personal project, I chose simplicity:

- **Next.js** for the framework
- **React** for the UI components
- **Google Maps API** for the interactive map
- **@dnd-kit** for drag-and-drop functionality
- **JSON file** as the database (perfect for a personal project)

I intentionally avoided over-engineering. Since this is a personal project, a JSON file works perfectly as a database — no need for MongoDB or MySQL when you're the only user.

## My Experience with Cursor AI

Building this app with Cursor was eye-opening. The AI assistant helped me:

- Set up the Google Maps integration quickly
- Implement drag-and-drop functionality with proper state management
- Create API routes for updating and adding countries
- Style the application with a cohesive design system
- Debug issues and refactor code efficiently

The conversational nature of working with Cursor made the development process feel more like pair programming than traditional coding. I could describe what I wanted, and the AI would help me implement it step by step.