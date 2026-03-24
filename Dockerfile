# Step 1: State the Base Operating System with Node.js pre-installed (Alpine is a very lightweight Linux)
FROM node:20-alpine

# Step 2: Set your dedicated working directory inside the Linux container
WORKDIR /app

# Step 3: Copy ONLY the package files first to leverage caching
COPY package*.json ./

# Step 4: Install backend dependencies inside the box
RUN npm install

# Step 5: Copy the rest of your backend source code
COPY . .

# Step 6: Expose the Port the API listens on
EXPOSE 5000

# Step 7: Give it the precise command to boot your backend
CMD ["npm", "start"]
