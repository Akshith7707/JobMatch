const axios = require('axios');
const pool = require('../db/pool');

const JSEARCH_API_KEY = process.env.RAPIDAPI_KEY;

const scrapers = {
  async remoteok() {
    try {
      const { data } = await axios.get('https://remoteok.com/api', {
        headers: { 'User-Agent': 'SkillSync/1.0' },
        timeout: 15000,
      });

      const jobs = Array.isArray(data) ? data : [];
      return jobs
        .filter(j => j.id && j.position)
        .slice(0, 50)
        .map(j => ({
          source: 'remoteok',
          source_id: String(j.id),
          url: j.url || `https://remoteok.com/remote-jobs/${j.id}`,
          title: j.position,
          company: j.company || 'Unknown',
          description: (j.description || '').replace(/<[^>]*>/g, ' ').slice(0, 5000),
          location: j.location || 'Remote',
          remote: true,
          salary_min: j.salary_min ? parseInt(j.salary_min) : null,
          salary_max: j.salary_max ? parseInt(j.salary_max) : null,
          tags: j.tags || [],
          posted_at: j.date ? new Date(j.date) : new Date(),
        }));
    } catch (err) {
      console.error('RemoteOK scrape failed:', err.message);
      return [];
    }
  },

  async arbeitnow() {
    try {
      const { data } = await axios.get('https://www.arbeitnow.com/api/job-board-api', {
        timeout: 15000,
      });

      const jobs = data?.data || [];
      return jobs
        .filter(j => j.slug && j.title)
        .slice(0, 50)
        .map(j => ({
          source: 'arbeitnow',
          source_id: j.slug,
          url: j.url || `https://www.arbeitnow.com/view/${j.slug}`,
          title: j.title,
          company: j.company_name || 'Unknown',
          description: (j.description || '').replace(/<[^>]*>/g, ' ').slice(0, 5000),
          location: j.location || '',
          remote: j.remote || false,
          salary_min: null,
          salary_max: null,
          tags: j.tags || [],
          posted_at: j.created_at ? new Date(j.created_at * 1000) : new Date(),
        }));
    } catch (err) {
      console.error('Arbeitnow scrape failed:', err.message);
      return [];
    }
  },

  async jsearch() {
    if (!JSEARCH_API_KEY) {
      console.log('JSearch: No RapidAPI key, skipping');
      return [];
    }

    const queries = ['react developer', 'node.js engineer', 'full stack developer'];
    const allJobs = [];

    for (const query of queries) {
      try {
        const { data } = await axios.get('https://jsearch.p.rapidapi.com/search', {
          params: {
            query: query,
            page: '1',
            num_pages: '1',
            country: 'us',
            date_posted: 'week',
          },
          headers: {
            'X-RapidAPI-Key': JSEARCH_API_KEY,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          },
          timeout: 15000,
        });

        const jobs = data?.data || [];
        const mapped = jobs
          .filter(j => j.job_id && j.job_title)
          .slice(0, 15)
          .map(j => ({
            source: 'jsearch',
            source_id: j.job_id,
            url: j.job_apply_link || j.job_google_link || '',
            title: j.job_title,
            company: j.employer_name || 'Unknown',
            description: (j.job_description || '').slice(0, 5000),
            location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', '),
            remote: j.job_is_remote || false,
            salary_min: j.job_min_salary ? parseInt(j.job_min_salary) : null,
            salary_max: j.job_max_salary ? parseInt(j.job_max_salary) : null,
            tags: [],
            posted_at: j.job_posted_at_datetime_utc ? new Date(j.job_posted_at_datetime_utc) : new Date(),
          }));

        allJobs.push(...mapped);

        // Rate limit: small delay between queries
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`JSearch query "${query}" failed:`, err.message);
      }
    }

    return allJobs;
  },

  async hackernews() {
    try {
      // Find the latest "Who is hiring" thread
      const { data: searchData } = await axios.get('https://hn.algolia.com/api/v1/search', {
        params: {
          query: 'Ask HN: Who is hiring',
          tags: 'ask_hn',
          hitsPerPage: 1,
        },
        timeout: 15000,
      });

      const thread = searchData?.hits?.[0];
      if (!thread) return [];

      // Fetch comments from the thread
      const { data: threadData } = await axios.get(
        `https://hn.algolia.com/api/v1/items/${thread.objectID}`,
        { timeout: 15000 }
      );

      const comments = (threadData?.children || [])
        .filter(c => c.text && c.text.length > 100)
        .slice(0, 40);

      return comments.map(c => {
        const text = c.text.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ');
        const firstLine = text.split('\n')[0].trim().slice(0, 200);

        const companyMatch = firstLine.match(/^([^|]+)/);
        const company = companyMatch ? companyMatch[1].trim() : 'HN Posting';
        const title = firstLine.slice(0, 150) || 'Engineering Role';

        const isRemote = /remote/i.test(text);
        const location = text.match(/(?:location|based in|office in)[:\s]+([^,.\n]+)/i)?.[1]?.trim() || '';

        return {
          source: 'hackernews',
          source_id: String(c.id),
          url: `https://news.ycombinator.com/item?id=${c.id}`,
          title,
          company,
          description: text.slice(0, 5000),
          location: location || (isRemote ? 'Remote' : ''),
          remote: isRemote,
          salary_min: null,
          salary_max: null,
          tags: [],
          posted_at: c.created_at ? new Date(c.created_at) : new Date(),
        };
      });
    } catch (err) {
      console.error('HackerNews scrape failed:', err.message);
      return [];
    }
  },
};

const scrapingAgent = {
  async scrapeAll() {
    console.log('Scraping jobs from all sources...');

    const results = await Promise.allSettled([
      scrapers.remoteok(),
      scrapers.arbeitnow(),
      scrapers.jsearch(),
      scrapers.hackernews(),
    ]);

    const allJobs = [];
    const sourceNames = ['remoteok', 'arbeitnow', 'jsearch', 'hackernews'];

    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        console.log(`  ${sourceNames[i]}: ${r.value.length} jobs`);
        allJobs.push(...r.value);
      } else {
        console.error(`  ${sourceNames[i]}: FAILED -`, r.reason?.message);
      }
    });

    console.log(`Total scraped: ${allJobs.length} jobs`);

    let inserted = 0;
    let skipped = 0;

    for (const job of allJobs) {
      try {
        if (!job.title || !job.source_id || !job.url) {
          skipped++;
          continue;
        }

        await pool.query(
          `INSERT INTO jobs (source, source_id, url, title, company, description, location, remote,
            salary_min, salary_max, tags, posted_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (source, source_id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            updated_at = NOW()`,
          [
            job.source, job.source_id, job.url, job.title, job.company,
            job.description, job.location, job.remote,
            job.salary_min, job.salary_max,
            JSON.stringify(job.tags), job.posted_at,
          ]
        );
        inserted++;
      } catch (err) {
        console.error(`Insert failed for ${job.source}/${job.source_id}:`, err.message);
        skipped++;
      }
    }

    console.log(`Inserted/updated: ${inserted}, Skipped: ${skipped}`);
    return { total: allJobs.length, inserted, skipped };
  },

  async scrapeSource(sourceName) {
    const scraper = scrapers[sourceName];
    if (!scraper) throw new Error(`Unknown source: ${sourceName}`);

    const jobs = await scraper();
    let inserted = 0;

    for (const job of jobs) {
      if (!job.title || !job.source_id || !job.url) continue;
      try {
        await pool.query(
          `INSERT INTO jobs (source, source_id, url, title, company, description, location, remote,
            salary_min, salary_max, tags, posted_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (source, source_id) DO UPDATE SET
            title = EXCLUDED.title, description = EXCLUDED.description, updated_at = NOW()`,
          [
            job.source, job.source_id, job.url, job.title, job.company,
            job.description, job.location, job.remote,
            job.salary_min, job.salary_max,
            JSON.stringify(job.tags), job.posted_at,
          ]
        );
        inserted++;
      } catch (err) {
        console.error(`Insert failed:`, err.message);
      }
    }

    return { total: jobs.length, inserted };
  },
};

module.exports = { scrapingAgent };
