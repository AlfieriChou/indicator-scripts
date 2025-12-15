import axios from "axios";
import { load } from "cheerio";
import fs from "fs";

const url = "http://m.yunjiu.com/quotations/detail743";
const filePath = "data/kweichow_moutai.json";
const logger = console;
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Accept-Language": "zh-CN,zh;q=0.9",
};

const info = {
  name: "茅台2025年飞天(散)53度/500ml",
  list: [],
};
fs.existsSync(filePath) ||
  fs.writeFileSync(filePath, JSON.stringify(info, null, 2));

const saveData = (data) => {
  const existInfo = JSON.parse(fs.readFileSync(filePath)) || info;
  const exist = existInfo.list.find((item) => item.date === data.date);
  if (!exist) {
    const saveList = [...existInfo.list, data].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );
    fs.writeFileSync(
      filePath,
      JSON.stringify({ ...existInfo, list: saveList }, null, 2),
    );
    logger.info(`【保存数据】 ${JSON.stringify(data)}`);
  }
};

const response = await axios.get(url, { headers });
const html = response.data;
const $ = load(html);

// 当日期缺少年份时按当前时间补全年份（1月仅1月用当年，其他含12月为上一年）
const normalizeDateWithYearGuess = (str, now = new Date()) => {
  const s = String(str || "").trim();
  let md = s.match(/(\d{1,2})[./-](\d{1,2})/);
  if (!md) {
    const zh = s.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    if (zh) md = [zh[0], zh[1], zh[2]];
  }
  if (!md) return null;
  const month = Number(md[1]);
  const day = Number(md[2]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  let year = nowYear;
  if (nowMonth === 1) {
    year = month === 1 ? nowYear : nowYear - 1;
  }
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

const anchors = $("div table tbody tr");
const dataList = [];
anchors.each((i, elem) => {
  const raw = $(elem).text().trim().replace(/\s+/g, " ");
  if (raw.includes("日期")) {
    return;
  }
  const items = raw.split(" ");
  const rawDate = items[0];
  const fixedDate = normalizeDateWithYearGuess(rawDate);
  dataList.push({
    date: fixedDate || rawDate,
    price: Number(items[1].replace(/,/g, "")),
    change: Number(items[2].split("，")[1]),
  });
});

for (const item of dataList) {
  saveData(item);
}

logger.info(`保存 ${dataList.length} 条数据`);
