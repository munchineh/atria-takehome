# pack bytes into a grayscale PNG with stored (uncompressed) deflate blocks
import sys, zlib, struct, math
def pack(data: bytes, out):
    data = struct.pack('>I', len(data)) + data
    W = 2048; H = math.ceil(len(data) / W); data = data + b'\0' * (W * H - len(data))
    raw = b''.join(b'\0' + data[i*W:(i+1)*W] for i in range(H))
    def chunk(t, d): c = struct.pack('>I', len(d)) + t + d; return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 0, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 0)) + chunk(b'IEND', b'')
    open(out, 'wb').write(png)
if __name__ == '__main__':
    pack(open(sys.argv[1], 'rb').read(), sys.argv[2])
