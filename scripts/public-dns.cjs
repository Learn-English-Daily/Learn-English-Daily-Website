const dns = require("node:dns");

// Local Windows fallback for machines where Node selects an inactive
// loopback DNS resolver. This runs before Next.js and MongoDB are loaded.
dns.setServers(["8.8.8.8", "1.1.1.1"]);
