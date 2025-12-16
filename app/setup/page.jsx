"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function SetupPage() {
  const { data: session, status } = useSession();

  const [companyApiKey, setCompanyApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Fetch company api_key securely from backend
  useEffect(() => {
    async function fetchCompanyKey() {
      try {
        const res = await fetch("/api/company");
        if (!res.ok) return;

        const data = await res.json();
        setCompanyApiKey(data.api_key);
      } catch (err) {
        console.error("Failed to fetch company API key");
      } finally {
        setLoading(false);
      }
    }

    if (status === "authenticated") {
      fetchCompanyKey();
    }
  }, [status]);

  const codeTemplate = `// For use with the Watch Changes module.
// Paste the webhook URL and company API key from your scenario here:

COMPANY_API_KEY = '${companyApiKey}';

WATCH_CHANGE_WEBHOOK_URL = 'https://ahmedshaheen19.app.n8n.cloud/webhook/0701a739-6f59-4d71-ae82-f7df1c91b955'; // OPTIONAL
SHEET = ''; // e.g. 'Sheet1'
RANGE = ''; // e.g. 'A1:C9'


// For use with the Perform a Function module:
PERFORM_FUNCTION_WEBHOOK_URL = '';

//////////////////////////////////////////////////////////////////
//                     DO NOT TOUCH BELOW                        //
//////////////////////////////////////////////////////////////////

function watchChanges(e) {

  const UPDATE_WEBHOOK_URL = WATCH_CHANGE_WEBHOOK_URL;

  if (!UPDATE_WEBHOOK_URL) {
    throw new Error('Enter WATCH_CHANGE_WEBHOOK_URL');
  }

  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getActiveSheet();

  var dataRange = sheet.getDataRange();
  var dataArr = sheet.getRange(
    e.range.rowStart,
    1,
    e.range.rowEnd - e.range.rowStart + 1,
    dataRange.getLastColumn()
  ).getValues();

  var rowValues = [];

  dataArr.forEach(function (row) {
    var out = {};
    row.forEach(function (v, i) {
      out[i] = v;
    });
    rowValues.push(out);
  });

  var payload = {
    company_api_key: COMPANY_API_KEY,
    spreadsheetId: e.source.getId(),
    spreadsheetName: e.source.getName(),
    sheetName: sheet.getName(),
    rangeA1Notation: e.range.getA1Notation(),
    value: e.value,
    oldValue: e.oldValue,
    rowValues: rowValues
  };

  UrlFetchApp.fetch(UPDATE_WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}
`;

  function copyCode() {
    navigator.clipboard.writeText(codeTemplate);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  if (loading) {
    return <p className="text-gray-400">Loading setup…</p>;
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Setup</h1>

      <label className="block mb-1 font-medium">Your Company API Key</label>
      <input
        value={companyApiKey}
        readOnly
        className="w-full p-2 mb-4 rounded bg-gray-800 text-gray-400 cursor-not-allowed"
      />

      <label className="block mb-1 font-medium">Integration Code</label>

      <pre
        className="
          bg-gray-900 text-green-400 text-sm p-4 rounded
          max-h-[65vh]
          overflow-y-auto
          whitespace-pre-wrap
        "
      >
        {codeTemplate}
      </pre>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={copyCode}
          className="bg-blue-600 text-white px-4 py-2 rounded
                     hover:bg-blue-700 transition"
        >
          Copy
        </button>

        {copied && (
          <span className="text-sm text-green-600 font-medium">Copied ✓</span>
        )}
      </div>
    </div>
  );
}
