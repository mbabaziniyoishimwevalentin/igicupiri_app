---
description: Repository Information Overview
alwaysApply: true
---

# IGICUPURI Information

## Summary
IGICUPURI is a full-stack application consisting of a React Native mobile/web client built with Expo and a Node.js backend server. The application appears to be an academic paper management system with features for uploading, browsing, and managing academic papers with different user roles (admin, lecturer, regular users).

## Structure
- **src/**: Contains the React Native client application code
  - **components/**: Reusable UI components
  - **screens/**: Application screens for different routes
- **server/**: Backend Express.js server
  - **src/**: Server source code
  - **src/config/**: Configuration files
  - **src/routes/**: API route definitions
  - **src/middleware/**: Express middleware
  - **src/scripts/**: Utility scripts
- **assets/**: Application images and icons
- **uploads/**: Directory for storing uploaded files

## Projects

### Client Application (React Native with Expo)
**Configuration File**: package.json, app.json, tsconfig.json

#### Language & Runtime
**Language**: TypeScript, JavaScript
**Version**: TypeScript 5.8.3
**Framework**: React Native 0.79.6, Expo 53.0.22
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- expo: ~53.0.22
- react: 19.0.0
- react-native: 0.79.6
- react-dom: 19.0.0
- react-native-web: ^0.20.0
- @expo/metro-runtime: ~5.0.4

**Development Dependencies**:
- @babel/core: ^7.25.2
- @types/react: ~19.0.10
- typescript: ~5.8.3

#### Build & Installation
```bash
npm install
npm start
```

#### Usage
The client application can be run on different platforms:
```bash
npm run android  # Run on Android
npm run ios      # Run on iOS
npm run web      # Run on web browser
```

### Server Application (Node.js/Express)
**Configuration File**: server/package.json, server/tsconfig.json

#### Language & Runtime
**Language**: TypeScript, JavaScript
**Version**: TypeScript 5.6.2, Node.js
**Framework**: Express 4.19.2
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- express: ^4.19.2
- pg: ^8.12.0 (PostgreSQL client)
- bcryptjs: ^2.4.3
- jsonwebtoken: ^9.0.2
- multer: ^1.4.5-lts.1
- cors: ^2.8.5
- dotenv: ^16.4.5
- morgan: ^1.10.0
- zod: ^3.23.8

**Development Dependencies**:
- typescript: ^5.6.2
- ts-node: ^10.9.2
- ts-node-dev: ^2.0.0
- @types/node: ^20.14.12
- @types/express: ^4.17.21
- @types/pg: ^8.11.6
- @types/bcryptjs: ^2.4.2
- @types/jsonwebtoken: ^9.0.6
- @types/multer: ^1.4.12
- @types/morgan: ^1.9.7
- @types/cors: ^2.8.17

#### Build & Installation
```bash
cd server
npm install
npm run build
```

#### Usage
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start

# Seed admin user
npm run seed:admin
```

#### Configuration
The server uses environment variables for configuration:
- PORT: Server port (default: 4000)
- DATABASE_URL: PostgreSQL connection string
- JWT_SECRET: Secret for JWT token generation
- UPLOAD_DIR: Directory for file uploads