import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Supabase Admin Client (for backend operations)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Cloudflare API Helper
const cfApi = axios.create({
  baseURL: "https://api.cloudflare.com/client/v4",
  headers: {
    Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    "Content-Type": "application/json",
  },
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Fetch all available zones from Cloudflare
app.get("/api/zones", async (req, res) => {
  try {
    const response = await cfApi.get("/zones");
    res.json(response.data.result.map((z: any) => ({
      id: z.id,
      name: z.name
    })));
  } catch (error: any) {
    console.error("Error fetching zones:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch Cloudflare zones" });
  }
});

// Create Subdomain
app.post("/api/subdomains", async (req, res) => {
  const { name, content, type, userId, zoneId, zoneName } = req.body;

  if (!name || !content || !type || !userId || !zoneId || !zoneName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1. Create DNS record in Cloudflare
    const cfResponse = await cfApi.post(`/zones/${zoneId}/dns_records`, {
      type,
      name: `${name}.${zoneName}`,
      content,
      ttl: 1, // Auto
      proxied: true,
    });

    const dnsRecord = cfResponse.data.result;

    // 2. Store in Supabase
    const { data, error } = await supabaseAdmin
      .from("subdomains")
      .insert([
        {
          user_id: userId,
          name: name,
          full_domain: `${name}.${zoneName}`,
          content: content,
          type: type,
          cf_record_id: dnsRecord.id,
          zone_id: zoneId,
          zone_name: zoneName
        },
      ])
      .select();

    if (error) throw error;

    res.json(data[0]);
  } catch (error: any) {
    console.error("Error creating subdomain:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.errors?.[0]?.message || "Failed to create subdomain" });
  }
});

// Delete Subdomain
app.delete("/api/subdomains/:id", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  try {
    // 1. Get record from Supabase to get CF ID and Zone ID
    const { data: record, error: fetchError } = await supabaseAdmin
      .from("subdomains")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !record) {
      return res.status(404).json({ error: "Subdomain not found" });
    }

    // 2. Delete from Cloudflare
    await cfApi.delete(`/zones/${record.zone_id}/dns_records/${record.cf_record_id}`);

    // 3. Delete from Supabase
    const { error: deleteError } = await supabaseAdmin
      .from("subdomains")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting subdomain:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to delete subdomain" });
  }
});

// List Subdomains for User
app.get("/api/subdomains", async (req, res) => {
  const { userId } = req.query;

  try {
    const { data, error } = await supabaseAdmin
      .from("subdomains")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch subdomains" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
