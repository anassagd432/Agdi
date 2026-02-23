const nmapOutput = `Starting Nmap 7.94
Nmap scan report for target
PORT     STATE SERVICE VERSION
80/tcp   open  http    Apache httpd 2.4.41
443/tcp  open  https   nginx 1.18.0
22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.11`;

const ports = [];
const lines = nmapOutput.split('\n');
for (const line of lines) {
    const match = line.match(/^(\d+)\/([a-z]+)\s+open\s+([\w-]+)\s+(.*)$/i);
    if (match) {
        ports.push({
            port: parseInt(match[1], 10),
            service: match[3],
            version: match[4].trim()
        });
    }
}
console.log(ports);
