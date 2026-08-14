import app from "../server";

export default function handler(req: any, res: any) {
  const targetChannelId = (req.query?.id as string) || "0-9-zeetamil";
  const format = (req.query?.format as string) || "full";
  
  req.url = `/api/playback?id=${encodeURIComponent(targetChannelId)}&format=${encodeURIComponent(format)}`;
  return app(req, res);
}
