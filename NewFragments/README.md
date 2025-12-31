# NewFragments

A small cloud service that stores little pieces of data—not big documents—like short texts (notes, CSV, JSON, Markdown) and images (PNG/JPG/WebP/AVIF/GIF). They call each piece a "fragment."

## Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/shara111/NewFragments.git
   cd NewFragments
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Available Scripts

### `npm start`

Runs the application in production mode.

```bash
npm start
```

- Starts the server using `node src/server.js`
- Uses production environment settings
- Server runs on port 8080 (or PORT environment variable)

### `npm run dev`

Runs the application in development mode with auto-restart.

```bash
npm run dev
```

- Uses `debug.env` file for environment variables
- Automatically restarts when files change (`--watch` flag)
- Perfect for development and testing

### `npm run debug`

Runs the application with VSCode debugger support.

```bash
npm run debug
```

- Enables Node.js inspector on `0.0.0.0:9229`
- Uses `debug.env` file for environment variables
- Includes file watching for auto-restart
- **Use this with VSCode debugger for breakpoint debugging**

### `npm run lint`

Runs ESLint to check code quality and style.

```bash
npm run lint
```

- Checks all JavaScript files in `./src/**/*.js`
- Follows project's ESLint configuration
- Run this before committing code

## VSCode Debugging Setup

### Prerequisites

- VSCode with Node.js debugging extension
- Debug configuration already set up in `.vscode/launch.json`

### How to Debug

1. **Set a breakpoint**:
   - Open `src/app.js`
   - Click in the left margin next to any line to set a red breakpoint dot
   - Recommended: Set breakpoint on line 36 (`res.status(200).json({`)

2. **Start debugging**:
   - Open Run and Debug panel (Ctrl+Shift+D or Cmd+Shift+D)
   - Select "Debug via npm run debug" from dropdown
   - Click the green play button or press F5

3. **Test the breakpoint**:
   - In terminal: `curl http://localhost:8080`
   - Or open browser: `http://localhost:8080`
   - Debugger should pause at your breakpoint

4. **Debug controls**:
   - **Continue (F5)**: Resume execution
   - **Step Over (F10)**: Execute current line, move to next
   - **Step Into (F11)**: Go into function calls
   - **Step Out (Shift+F11)**: Complete current function
   - **Restart (Ctrl+Shift+F5)**: Restart debugging session
   - **Stop (Shift+F5)**: Stop debugging

5. **Inspect variables**:
   - Use **Variables** panel to see current scope variables
   - Use **Debug Console** to evaluate expressions
   - Use **Call Stack** to see execution path

## Environment Configuration

### `debug.env` file

Contains development environment variables:

```
PORT=8080
NODE_ENV=development
```

## API Endpoints

### Health Check

- **GET** `/`
- Returns server status and basic information
- Response:
  ```json
  {
    "status": "ok",
    "author": "Shara111",
    "githubUrl": "https://github.com/shara111/NewFragments",
    "version": "0.0.1"
  }
  ```

### 404 Handler

- Any other route returns 404 error
- Response:
  ```json
  {
    "status": "error",
    "error": {
      "message": "not found",
      "code": 404
    }
  }
  ```

## Project Structure

```
NewFragments/
├── src/
│   ├── app.js          # Express app configuration and routes
│   ├── server.js       # Server startup and configuration
│   └── logger.js       # Logging configuration
├── .vscode/
│   └── launch.json     # VSCode debug configuration
├── debug.env           # Development environment variables
├── package.json        # Project dependencies and scripts
└── README.md          # This file
```

## Dependencies

### Production

- `express`: Web framework
- `cors`: Cross-origin resource sharing
- `helmet`: Security middleware
- `compression`: Response compression
- `pino`: Fast JSON logger
- `pino-http`: HTTP request logging
- `stoppable`: Graceful server shutdown

### Development

- `eslint`: Code linting
- `prettier`: Code formatting

## Troubleshooting

### Debugger not hitting breakpoints

1. Ensure you're using VSCode debugger (not running `npm run debug` directly)
2. Check that breakpoint is set on the correct line
3. Verify you're hitting the right endpoint (`http://localhost:8080`)
4. Check Debug Console for error messages

### Server won't start

1. Check if port 8080 is available
2. Verify `debug.env` file exists
3. Run `npm install` to ensure dependencies are installed
4. Check terminal for error messages

### Linting errors

1. Run `npm run lint` to see all issues
2. Fix errors manually or use VSCode ESLint extension
3. Some errors can be auto-fixed with VSCode

## Development Workflow

1. **Start development**: `npm run dev`
2. **Make changes** to your code
3. **Test with curl**: `curl http://localhost:8080`
4. **Debug issues**: Use `npm run debug` with VSCode
5. **Check code quality**: `npm run lint`
6. **Commit changes** when ready

## Author

Shara111 - [GitHub](https://github.com/shara111/NewFragments)
