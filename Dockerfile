# TODO: use ARG as parameters - ARG BUILD_DIRECTORY=/app
# TODO: use ARG as parameters - ARG DEPLOY_DIRECTORY=/usr/local/lib

# Use an official Node runtime as a parent image
FROM node:20.18.1

# Install yt-dlp binary (needed for ytdlp-nodejs library)
#RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/download/2025.03.27/yt-dlp_linux -o /usr/local/bin/yt-dlp && \
#RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/download/2025.03.27/yt-dlp_linux_aarch64 -o /usr/local/bin/yt-dlp && \
#    chmod +x /usr/local/bin/yt-dlp

#COPY --from=mwader/static-ffmpeg:7.1.1 /ffmpeg /usr/local/bin/

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy necessary directory contents into the container
COPY . .

# TODO: copy and build frontend directory, bake it into backend static ruotes
# Install dependencies and build /dist to be run with "npm start";
# after building, dev dependancies and source are no longer needed - delete
RUN npm install &&\
    #npm test &&\
    #rm -rf test &&\
    #rm -rf .env-test &&\
    npm run build &&\
    rm -rf src &&\
    rm -rf tsconfig.json &&\
    npm prune --production

#COPY package_overrides/@distube-youtube-index.js node_modules/@distube/youtube/dist/index.js
#COPY package_overrides/@distube-ytdl-core-sig.js node_modules/@distube/ytdl-core/lib/sig.js
COPY package_overrides/youtube-search-api-dist-index.js node_modules/youtube-search-api/dist/index.js

CMD ["npm", "run", "start"]