function encode(value) {
  return encodeURIComponent(String(value));
}

export class SupabaseStore {
  constructor({ url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY } = {}) {
    if (!url || !key) {
      throw new Error("Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.");
    }
    this.base = `${url.replace(/\/$/, "")}/rest/v1`;
    this.headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    };
  }

  async request(table, { method = "GET", query = "", body, prefer } = {}) {
    const response = await fetch(`${this.base}/${table}${query ? `?${query}` : ""}`, {
      method,
      headers: { ...this.headers, ...(prefer ? { Prefer: prefer } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const error = new Error(data?.message || data?.details || "Không thể truy cập cơ sở dữ liệu.");
      error.status = response.status;
      error.code = data?.code;
      throw error;
    }
    return data;
  }

  async session(token, now = Date.now()) {
    const rows = await this.request("sessions", {
      query: `select=voter_id,expires&token=eq.${encode(token)}&expires=gt.${now}&limit=1`,
    });
    return rows[0] || null;
  }

  async createSession(token, voterId, expires) {
    await this.request("sessions", {
      method: "POST",
      body: { token, voter_id: voterId, expires },
      prefer: "return=minimal",
    });
  }

  async deleteSession(token) {
    await this.request("sessions", {
      method: "DELETE",
      query: `token=eq.${encode(token)}`,
      prefer: "return=minimal",
    });
  }

  async listVotes(voterId = null) {
    const filter = voterId ? `&voter_id=eq.${encode(voterId)}` : "";
    return this.request("votes", {
      query: `select=id,voter_id,candidate_id,category,request_id,created_at${filter}&order=id.desc`,
    });
  }

  async voteByRequest(voterId, requestId) {
    const rows = await this.request("votes", {
      query: `select=candidate_id&voter_id=eq.${encode(voterId)}&request_id=eq.${encode(requestId)}&limit=1`,
    });
    return rows[0] || null;
  }

  async insertVote(vote) {
    try {
      await this.request("votes", {
        method: "POST",
        body: vote,
        prefer: "return=minimal",
      });
      return "inserted";
    } catch (error) {
      if (error.status !== 409) throw error;
      const previous = await this.voteByRequest(vote.voter_id, vote.request_id);
      if (previous) {
        return Number(previous.candidate_id) === Number(vote.candidate_id)
          ? "replayed"
          : "request-conflict";
      }
      return "quota-conflict";
    }
  }
}
