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

  const codeTemplate = `//For use with the Watch Changes module. Paste the webhook URL and company ID from your scenario here:
COMPANY_API_KEY = '${companyApiKey}';
WATCH_CHANGE_WEBHOOK_URL = 'https://ahmedshaheen19.app.n8n.cloud/webhook/0701a739-6f59-4d71-ae82-f7df1c91b955'; //OPTIONAL (for use with Watch Changes):
SHEET = ''; //SHEET allows you to trigger updates only for the specified sheet (by name)
// e.g. SHEET = 'Sheet1'
RANGE = ''; //RANGE allows you to trigger updates only for values within this range (by A1 notation)
// e.g. RANGE = 'A1:C9'




//For use with the Perform a Function module. Paste the webhook URL from your scenario here:
PERFORM_FUNCTION_WEBHOOK_URL =  '';






 ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 ////////////////////////////////////////////////     DO NOT TOUCH BELOW!!!     ////////////////////////////////////////////////////////////
 ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




function watchChanges(e) {


 // REQUIRED
 const UPDATE_WEBHOOK_URL = WATCH_CHANGE_WEBHOOK_URL;


 if(!UPDATE_WEBHOOK_URL) {
   console.log('Enter WATCH_CHANGE_WEBHOOK_URL');
   throw new Error('Enter WATCH_CHANGE_WEBHOOK_URL');
 }


 // OPTIONAL
 const sheetValue = SHEET;
 const rangeValue = RANGE;


 const ss = SpreadsheetApp.getActive();
 const sheet = ss.getActiveSheet();


 if (sheetValue && sheetValue !== '' && sheetValue !== sheet.getName()) {
   console.log('No triggering');
   return null;
 }
 if (sheetValue && sheetValue && rangeValue !== '' && !isWithinRange_(e.range.getA1Notation(), rangeValue)) {
   console.log('No triggering');
   return null;
 }


 var dataRange = sheet.getDataRange();
 var dataArr = sheet.getRange(e.range.rowStart, 1, e.range.rowEnd - e.range.rowStart + 1, dataRange.getLastColumn()).getValues();
 var rowValues = [];


 dataArr.forEach(function (row) {
   var out = {};
   row.forEach(function (v, i) {
     out[i] = v;
   });


   rowValues.push(out);
 });


var payload = {
  company_api_key: COMPANY_API_KEY, // gets the company ID

  spreadsheetId: e.source.getId(),
  spreadsheetName: e.source.getName(),
  sheetId: e.source.getSheetId(),
  sheetName: e.source.getSheetName(),
  rangeA1Notation: e.range.getA1Notation(),
  range: e.range,
  oldValue: e.oldValue,
  value: e.value,
  user: e.user,
  rowValues: rowValues
};



 var options = {
   method: 'post',
   contentType: 'application/json',
   payload: JSON.stringify(payload)
 };


 var response = UrlFetchApp.fetch(UPDATE_WEBHOOK_URL, options);
 console.log(response);


}


function isWithinRange_(a1Notation, rangeToCheck) {
 // arguments = [a1Notation, rangeToCheck]


 var input = Array.prototype.map.call(arguments, function (e) {
   return e.toUpperCase();
 });
 var rangeArgs = /^([A-Z]+)?(\d+)?:([A-Z]+)?(\d+)?$/.exec(input[1]);
 var a1NotationArgs = /^([A-Z]+)(\d+)$/.exec(input[0]).map(function (e, i) {
   return i == 1 ? ('  ' + e).substr(-2) : e * 1;
 });
 /* If range arguments are missing(like missing end column in "A1:1"), add arbitrary arguments(like "A1:ZZ1")*/
 rangeArgs = rangeArgs.map(function (e, i) {
   return e === undefined ?
     i % 2 === 0 ?
       i > 2 ?
         Infinity : -Infinity
       : i > 2 ?
         'ZZ' : ' A'
     : i % 2 === 0 ?
       e * 1 : ('  ' + e).substr(-2);
 });
 console.log(rangeArgs, a1NotationArgs);
 return (a1NotationArgs[1] >= rangeArgs[1] &&
   a1NotationArgs[1] <= rangeArgs[3] &&
   a1NotationArgs[2] >= rangeArgs[2] &&
   a1NotationArgs[2] <= rangeArgs[4]);
}
`;

  /**
   * @return The result of the n8n scenario execution.
   * @customfunction
   */
  function n8n(input) {
    const FUNCTION_WEBHOOK_URL = PERFORM_FUNCTION_WEBHOOK_URL;

    if (!FUNCTION_WEBHOOK_URL) {
      console.log("Enter PERFORM_FUNCTION_WEBHOOK_URL");
      throw new Error("Enter PERFORM_FUNCTION_WEBHOOK_URL");
    }

    var spreadsheet = SpreadsheetApp.getActive();
    var cell = spreadsheet.getActiveCell();

    var payload = {
      spreadsheetId: spreadsheet.getId(),
      spreadsheetName: spreadsheet.getName(),
      sheetId: spreadsheet.getSheetId(),
      sheetName: spreadsheet.getSheetName(),
      cell: cell.getA1Notation(),
      col: cell.getColumn(),
      row: cell.getRow(),
      parametersArray: [],
      parametersCollection: {},
    };

    for (var i = 0; i < arguments.length; i++) {
      payload.parametersArray.push(arguments[i]);
      payload.parametersCollection["p" + i] = arguments[i];
    }

    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
    };

    var response = UrlFetchApp.fetch(FUNCTION_WEBHOOK_URL, options);

    return JSON.parse(response.getContentText()).value;
  }

  /**
   * @return The result of the n8n scenario execution.
   * @customfunction
   */
  function n8n_FUNCTION(input) {
    return n8n(input);
  }

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
