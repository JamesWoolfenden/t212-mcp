# Security Best Practices for t212-mcp-server

## Overview

This MCP server provides **read-only** access to your Trading212 account. While it cannot execute trades or modify your account, proper security practices are essential to protect your financial data and API credentials.

## 🔒 API Key Security

### Do's ✅

- **Store API keys in environment variables only**

  ```bash
  export T212_API_KEY="your-api-key-here"
  ```

- **Use Trading212's demo/practice account for testing**
  - Test all functionality before connecting your live account
  - Verify the server behaves as expected

- **Restrict API key permissions** (if Trading212 supports scoped keys)
  - Use read-only scopes only
  - Never grant write/trade permissions

- **Rotate API keys regularly**
  - Generate new keys every 90 days
  - Immediately revoke compromised keys

- **Set proper file permissions on config files**

  ```bash
  # macOS/Linux
  chmod 600 ~/.config/Claude/claude_desktop_config.json
  
  # Windows (PowerShell)
  icacls "$env:APPDATA\Claude\claude_desktop_config.json" /inheritance:r /grant:r "$env:USERNAME:F"
  ```

### Don'ts ❌

- **Never hardcode API keys in source code**
- **Never commit API keys to version control**

  ```bash
  # Add to .gitignore
  .env
  *.config.json
  claude_desktop_config.json
  ```

- **Never share API keys in screenshots or logs**
- **Never use production keys in development/testing**
- **Never store API keys in plaintext files without proper permissions**

## 🛡️ Configuration Security

### Secure Configuration Example

```json
{
  "mcpServers": {
    "t212-mcp": {
      "command": "npx",
      "args": ["t212-mcp-server"],
      "env": {
        "T212_API_KEY": "${T212_API_KEY}"
      }
    }
  }
}
```

Then set the environment variable separately:

```bash
# macOS/Linux - Add to ~/.zshrc or ~/.bashrc
export T212_API_KEY="your-key-here"

# Windows - Set system environment variable
setx T212_API_KEY "your-key-here"
```

### Insecure Configuration (Don't Do This!)

```json
{
  "mcpServers": {
    "t212-mcp": {
      "env": {
        "T212_API_KEY": "pk_live_abcd1234..."  ❌ NEVER DO THIS
      }
    }
  }
}
```

## 🔍 Security Features

This server implements several security measures:

### 1. **Input Validation**

- Ticker symbols are validated and sanitized
- Path traversal attempts are blocked
- Only alphanumeric characters, dots, and hyphens allowed in tickers

### 2. **Read-Only Operations**

- All API calls use GET requests only
- No POST/PUT/DELETE operations possible
- Cannot place trades or modify account settings

### 3. **Rate Limiting**

- Built-in throttling (100ms between requests)
- Prevents API rate limit violations
- Protects against accidental DoS

### 4. **Error Handling**

- Errors don't expose sensitive information
- API keys never logged or displayed
- Generic error messages returned to users

### 5. **Response Validation**

- API responses validated before processing
- Malformed data rejected safely
- Type checking enforced

## 🚨 What to Do If Your API Key Is Compromised

1. **Immediately revoke the key in Trading212**
   - Log into Trading212
   - Go to Settings → API
   - Delete the compromised key

2. **Generate a new API key**
   - Create a new key with minimal permissions
   - Update your environment variable

3. **Review account activity**
   - Check for any suspicious transactions
   - Review API access logs if available

4. **Update all configurations**
   - Replace the old key in all locations
   - Restart Claude Desktop

## 📊 Monitoring and Auditing

### What to Monitor

- **Unusual API activity patterns**
  - Requests at odd hours
  - High request volumes
  - Requests for unusual endpoints

- **Error rates**
  - Sudden increase in 401/403 errors (potential unauthorized access)
  - Rate limit errors (potential abuse)

### Logging Best Practices

The server logs errors to stderr. To capture logs:

```bash
# macOS/Linux
t212-mcp-server 2> ~/t212-mcp.log

# Review logs periodically
tail -f ~/t212-mcp.log
```

**Important**: Logs should never contain:

- API keys
- Account balances
- Position details
- Personal information

## 🔐 Additional Security Recommendations

### Network Security

- This server uses stdio transport (local only)
- Never expose this server over a network
- Do not create HTTP wrappers around it

### System Security

- Keep Node.js and npm updated
- Run `npm audit` regularly
- Review dependency updates before applying

### Principle of Least Privilege

- Only grant Claude Desktop the minimum permissions needed
- Consider using a separate Trading212 account for AI interactions
- Limit the data accessible through this integration

## 📝 Security Checklist

Before deploying to production:

- [ ] API key stored in environment variable
- [ ] Config file permissions restricted (600 or equivalent)
- [ ] Tested with demo account first
- [ ] API key has minimal required permissions
- [ ] Regular key rotation schedule established
- [ ] Error logging configured and monitored
- [ ] Dependencies audited for vulnerabilities
- [ ] .gitignore includes config files
- [ ] Backup API key stored securely (password manager)
- [ ] Team members trained on security practices

## 🐛 Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT open a public issue**
2. Email the maintainer directly (see package.json)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## 📚 Additional Resources

- [Trading212 API Documentation](https://t212public-api-docs.redoc.ly/)
- [MCP Security Best Practices](https://modelcontextprotocol.io/security)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

---

**Remember**: Security is an ongoing process, not a one-time setup. Stay vigilant and keep your systems updated.
