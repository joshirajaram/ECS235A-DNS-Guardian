
import socket
from dnslib import DNSRecord
q = DNSRecord.question('www.example.test.', 'A')
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.settimeout(2.0)
s.sendto(q.pack(), ('127.0.0.1', 1053))
try:
    data, addr = s.recvfrom(4096)
    print('REPLY from', addr)
    print(DNSRecord.parse(data))
except Exception as e:
    print('No reply:', e)



