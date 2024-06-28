<div align="center">
  <h3 align="center">wAIfu</h3>
  <p align="center">An AI anime companion with live2d</p>
</div>

### Built With
* [Next.js](https://nextjs.org/)
* [Vercel AI](https://vercel.com/ai)
* [ElevenLabs](https://eleven-labs.com/)
* [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display/)

### Prerequisites
* node
* pnpm >= 9.2.0
  ```sh
  npm install -g pnpm
  ```
* ChatGPT or Groq API key (optional)
* Mistral API key (optional)
* ElevenLabs API key

    or if you have the GitHub CLI installed

    ```sh
   gh repo clone unteifu/wAIfu
    ```
2. Install NPM packages
    ```sh
    pnpm install
    ```
3. Copy the `.env.example` and rename to `.env` in the root directory and update the following values
    ```env
    OPENAI_API_KEY="your_chatgpt_api_key"
    MISTRAL_API_KEY="your_mistral_api_key"
    GROQ_API_KEY="your_groq_api_key"
    ELEVENLABS_API_KEY="your_elevenlabs_api_key"
    VOICE_ID="your_voice_id"
    ```
4. Run the development server
    ```sh
    pnpm run dev
    ```
5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result
