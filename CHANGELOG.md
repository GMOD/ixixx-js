# v1.0.8

- Use external sorting module for better scalability, using the great external-sorting package on NPM

# v1.0.7

- Use fs.createWriteStream instead of fs/promises for writing outputs

# v1.0.6

- Fix writing ix and ixx files to await the filehandle.writeFile call

# v1.0.5

- Print usage message for CLI tool
- Attempt to fix error "Cannot find module 'fs/promises'...
- Avoid potential file handle leak on error with try/finally

# v1.0.4

- Ensure ix is written before calculating ixx

# v1.0.3

- Fix borked typescript definitions again

# v1.0.2

- Fix typescript definitions on stream functions

# 1.0.1

- Redo borked release of 1.0.0

# 1.0.0

- Initial release
