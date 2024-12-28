# 使用Node.js 作為基礎鏡像
FROM node:16-alpine

# Set work dir
WORKDIR /app

# install dependence
COPY package*.json ./
RUN npm install

# copy source code
COPY . .

# set env variable
ENV PORT=3000
EXPOSE 3000

# 啟動
CMD ["node", "server.js"]