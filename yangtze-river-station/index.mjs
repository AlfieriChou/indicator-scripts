import axios from "axios";
import iconv from "iconv-lite";
import fs from "fs";

const url = "http://www.cjh.com.cn/sssqw3.html";
const filePath = "./data/hydrology.json";
const logger = console;

// 辅助方法：先于主逻辑定义，便于箭头函数引用
const parseSssqArrayFromHtml = (html) => {
  const m = html.match(/var\s+sssq\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) return null;
  let arrStr = m[1];
  try {
    return JSON.parse(arrStr);
  } catch (_) {
    try {
      arrStr = arrStr.replace(/\n/g, " ").replace(/,\s*]/, "]");
      return JSON.parse(arrStr);
    } catch (e2) {
      return null;
    }
  }
};

const formatDateYYYYMMDDFromMillis = (tm) => {
  if (tm == null) return null;
  const d = new Date(Number(tm));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const decodeTrendFromWptn = (wptn) => {
  const code = String(wptn).trim();
  if (code === "4") return "落";
  if (code === "5") return "涨";
  if (code === "6") return "平";
  return "平";
};

// 抓取并解析长江流域重要站实时水情表
const fetchHydrology = async () => {
  const resp = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; StatsAgent/1.0; +https://example.org)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: "http://www.cjh.com.cn/",
    },
    timeout: 20000,
    responseType: "arraybuffer",
    validateStatus: (s) => s >= 200 && s < 500,
  });

  const buf = resp.data;
  // 先按 utf-8 解码以检测 charset，再按需用 gbk 重新解码
  let html = iconv.decode(buf, "utf-8");
  const charsetMatch = String(html).match(/charset\s*=\s*([a-zA-Z0-9-]+)/i);
  const charset = charsetMatch ? charsetMatch[1].toLowerCase() : "";
  if (charset.includes("gb") || !/站名|水位|流量/.test(html)) {
    html = iconv.decode(buf, "gbk");
  }

  // 仅解析内嵌 sssq 数组并映射输出（简化逻辑）
  {
    const sssq = parseSssqArrayFromHtml(html);
    if (Array.isArray(sssq) && sssq.length > 0) {
      const mapped = sssq.map((it) => {
        const station = (it.stnm || it.stName || "-").toString().trim();
        const date = formatDateYYYYMMDDFromMillis(it.tm);
        const value = it.z != null ? Number(it.z).toFixed(2) : "";
        const flow =
          it.q != null && Number(it.q) > 0
            ? String(Math.round(Number(it.q)))
            : "";
        const trend = decodeTrendFromWptn(it.wptn);
        return { station, date, value, flow, trend };
      });
      const dedup = [];
      const seen = new Set();
      for (const r of mapped) {
        const key = `${r.station}`;
        if (!seen.has(key)) {
          seen.add(key);
          dedup.push(r);
        }
      }
      return dedup;
    }
  }
  // 若页面不含 sssq，则返回空数组（极简模式）
  return [];
};

const hyData = await fetchHydrology();
logger.info(`✅ 已获取 ${hyData.length} 条水情记录`, JSON.stringify(hyData));

const exists = JSON.parse(fs.readFileSync(filePath, "utf-8"));

const saveData = [];
for (const exist of exists) {
  const data = hyData.find((it) => it.station === exist.station);
  if (!data?.date) {
    saveData.push(exist);
    continue;
  }
  const item = exist?.list?.find((it) => it.date === data.date);
  if (!item) {
    saveData.push({
      ...exist,
      list: [...(exist?.list || []), data],
    });
    continue;
  }
  saveData.push({
    ...exist,
    list: exist?.list?.map((it) => {
      if (it.date === data.date) {
        return data;
      }
      return it;
    }),
  });
}

fs.writeFileSync(filePath, JSON.stringify(saveData, null, 2));
logger.info(`✅ 已更新 ${saveData.length} 条记录`);
