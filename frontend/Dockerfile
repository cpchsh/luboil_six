# 使用Node.js作為基礎Image
From node:18-alpine AS build

# 設置工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json 並安裝 dependence
COPY package*.json ./
RUN npm install

# copy source code and build 
COPY . .
RUN npm run build

# use Nginx as 靜態服務器
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# expose port
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]