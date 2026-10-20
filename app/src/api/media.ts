// shortcut: server uploads read local files in T-10; until then the RPC rejects missing files.
export async function readMedia(storagePath: string): Promise<Uint8Array | null> {
  void storagePath;
  return null;
}
