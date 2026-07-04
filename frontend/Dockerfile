FROM node:20-alpine

WORKDIR /usr/src/app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --legacy-peer-deps

COPY frontend/ .

ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
