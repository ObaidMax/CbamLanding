# Landed Carbon — AI feature upgrade

This version preserves the existing single-page website and embedded calculator, and adds only:

- A dashboard-top **Drop your files here** trigger
- A full-screen **Choose Your Files & Automate Your Workflow** modal
- AI document extraction with reviewed values applied to the existing dashboard
- A floating, context-aware **Landed AI** chatbot

## Deploy

Upload all files and folders to the root of the existing GitHub repository:

- `index.html`
- `api/analyze.js`
- `api/chat.js`
- `vercel.json`

In Vercel, add an environment variable named `OPENAI_API_KEY`, then redeploy. Optionally add `OPENAI_MODEL`; otherwise the functions use `gpt-5.6`.

Without an API key, the interfaces still work in demo/fallback mode, but document extraction and chat are not powered by the live model.

## Safety

AI extracts and explains. Existing JavaScript continues to calculate the exposure. Users review values before applying them.
