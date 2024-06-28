## Credits to [unteifu](https://github.com/unteifu/wAIfu) for creating this (Bro created this whole thing!)

# What is this for the?:
- Some more performance optimizations
- Latency improvments
- Live2d lag fix
- Speech to Text coming soon
- Moving background
- Live2d Mouth working


### Requirements (same with the original repo) 
* node
* pnpm >= 9.2.0
  ```sh
  npm install -g pnpm
  ```
* ChatGPT or Groq API key (optional)
* Mistral API key (optional, must choose either one of them)
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
5. Open [http://localhost:3000](http://localhost:3000) and wallah you done :)

Have a nice chat

