# 🎰 Fun Casino Project  

## 🎯 About the Project  
This project started as a fun collaboration between me and two friends who had the idea of programming a few small gambling-style games. What began as a simple coding experiment quickly turned into an exciting challenge!  

## 👨‍💻 What We Did  
- 🚀 Combined our skills to build a **functional online casino website**  
- 🎲 Developed several **mini gambling games** from scratch  
- 💡 Experimented with **game mechanics & web development**  
- 🔧 Learned a lot about **coding, design, and teamwork**  

## 🔥 Why We Did It  
This project was never intended as a commercial venture — it was just for fun! We wanted to:  
✅ **Improve our coding skills**  
✅ **Work on something creative together**  
✅ **Challenge ourselves with a real-world project**  

## 🚀 Tech Stack  
💻 **Frontend:** Kibou   
🖥️ **Backend:** DerPenetrator and Ortus  
📊 **Database:** Kibou

## Mongo Casino Deployment Notes

- Auth and account management run through Vercel Serverless routes in [api/auth/register.js](api/auth/register.js), [api/auth/login.js](api/auth/login.js), and [api/auth/me.js](api/auth/me.js).
- User and session snapshots are stored in Vercel Blob via [api/_lib/blobStore.js](api/_lib/blobStore.js).
- Required environment variable for production and preview deployments:
	- `BLOB_READ_WRITE_TOKEN`
	- Optional but recommended: `AUTH_STORAGE_NAMESPACE=mongo-casino-auth-storage`
- A sample env file is included in [.env.example](.env.example).

## Security and Product Criteria Coverage

- Licensing/Security UI messaging and SSL/RNG trust badges are integrated into the main lobby design.
- Bonus/Promotion blocks and package tiers are implemented in the MongoCoin store.
- Game variety includes playable Slot, Poker, Roulette, and Plinko with additional categories shown as coming soon.
- Fast payment/support concept is reflected in instant coin credit and account-centered flow.

---
