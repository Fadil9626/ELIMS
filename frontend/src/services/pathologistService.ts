// =============================================================
// 📦 API CONFIG
// =============================================================
const API_URL = "/api/pathologist";
const REQUEST_API = "/api/test-requests";

// =============================================================
// 🧩 TYPES
// =============================================================
export interface QualitativeValue {
	value: string;
}

export interface ResultTemplateItem {
	request_item_id: number;
	parent_test_id?: number | null;
	parent_name?: string | null;
	test_id: number;
	test_name: string;
	unit_name?: string | null;
	unit_symbol?: string | null;
	ref_range?: string | null;
	department_name?: string;
	is_panel?: boolean;
	type?: "qualitative" | "quantitative" | null;
	qualitative_values?: string[];
	status?: string;
	result_value?: string | number | boolean | null;
	analytes?: ResultTemplateItem[];
}

export interface ResultTemplate {
	request_id: number;
	items: ResultTemplateItem[];
}

export interface AnalyzerResults {
	test_item_id: number;
	instrument: string | null;
	sample_id: string | null;
	results: Record<string, { value: number | string; unit?: string | null }>;
	analyzer_meta?: any;
	updated_at: string;
}

export interface WorklistFilters {
	from?: string;
	to?: string;
	status?: string;
	search?: string;
	department?: string;
	sortBy?: string;
	order?: "asc" | "desc";
}

export interface WorklistItem {
	request_id: number;
	date_ordered: string;
	lab_id: string;
	patient_name: string;
	test_name: string;
	test_item_id: number;
	test_status: string;
	item_status?: string;
	department_name: string;
	verified_name?: string;
	reviewed_by?: string;
	updated_at?: string;
}

export interface StatusCounts {
	sample_collected?: number;
	in_progress?: number;
	completed?: number;
	verified?: number;
	released?: number;
}

// =============================================================
// ⚙️ API HELPER
// =============================================================
const apiFetch = async <T>(
	url: string,
	token: string,
	options: RequestInit = {}
): Promise<T> => {
	const headers: Record<string, string> = {
		Authorization: `Bearer ${token}`,
		...(options.body ? { "Content-Type": "application/json" } : {}),
		...(options.headers as Record<string, string>) || {},
	};

	const res = await fetch(url, { ...options, headers });
	const text = await res.text();

	if (!res.ok) {
		let message: string;
		try {
			const parsed = JSON.parse(text);
			message = parsed.message || parsed.error || text;
		} catch {
			message = text;
		}
		const error = new Error(
			`❌ API Error: ${message || res.statusText} (${res.status}) at ${url}`
		);
		(error as any).status = res.status;
		(error as any).url = url;
		throw error;
	}

	try {
		return text ? JSON.parse(text) : ({} as T);
	} catch {
		return text as unknown as T;
	}
};

// =============================================================
// 📋 Worklist & Filters
// =============================================================
export const getWorklist = async (
	token: string,
	filters: WorklistFilters = {}
): Promise<WorklistItem[]> => {
	const cleanFilters = Object.fromEntries(
		Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null)
	);
	const query = new URLSearchParams(cleanFilters as any).toString();
	// ✅ FIX: Backend returns the array directly, no .data property
	return apiFetch<WorklistItem[]>(`${API_URL}/worklist?${query}`, token);
};

export const getResults = getWorklist;

// =============================================================
// 📊 Dashboard Counts
// =============================================================
export const getStatusCounts = async (token: string): Promise<StatusCounts> => {
	return apiFetch<StatusCounts>(`${API_URL}/status-counts`, token);
};

// =============================================================
// 🧩 Enhanced Result Template (Panels + Analytes + Types)
// =============================================================
export const getResultTemplate = async (
	token: string,
	requestId: number
): Promise<ResultTemplate> => {
	const data = await apiFetch<ResultTemplate>(
		`${API_URL}/result-template/${requestId}`,
		token
	);

	// 🔹 Normalize qualitative & quantitative items
	data.items = data.items.map((item) => ({
		...item,
		unit_symbol: item.unit_symbol || item.unit_name || "", // ✅ fallback
		type:
			item.type ||
			(item.ref_range?.toLowerCase().includes("positive") ||
			item.ref_range?.toLowerCase().includes("negative") ||
			item.ref_range?.toLowerCase().includes("reactive")
				? "qualitative"
				: "quantitative"),

		// ✅ FIX: Removed the hard-coded fallback array.
		// This will now correctly use the qualitative_values array
		// (e.g., ["Positive", "Negative"]) sent from the backend.
		qualitative_values: (item.qualitative_values || []).filter(Boolean),
	}));

	return data;
};

// =============================================================
// ✍️ Submit Single Result
// =============================================================
export const submitResult = async (
	token: string,
	testItemId: number,
	resultValue: any
): Promise<any> => {
	return apiFetch<any>(`${API_URL}/result/${testItemId}`, token, {
		method: "PUT",
		body: JSON.stringify({ result: resultValue }),
	});
};

// =============================================================
// 🧾 Result History
// =============================================================
export const getResultHistory = async (
	token: string,
	testItemId: number
): Promise<any[]> => {
	// ✅ FIX: Backend returns the array directly, no .data property
	return apiFetch<any[]>(`${API_URL}/result-history/${testItemId}`, token);
};

// =============================================================
// ✅ Verification & Review
// =============================================================
export const verifyResult = async (
	token: string,
	testItemId: number
): Promise<any> => {
	return apiFetch<any>(`${API_URL}/verify/${testItemId}`, token, {
		method: "POST",
	});
};

export const reopenResult = async (
	token: string,
	testItemId: number
): Promise<any> => {
	return apiFetch<any>(`${API_URL}/reopen/${testItemId}`, token, {
		method: "POST",
	});
};

export const markForReview = async (
	token: string,
	testItemId: number
// ℹ️ Semantic fix: Changed return type from AnalyzerResults to 'any' since it's a status update PATCH
): Promise<any> => { 
	return apiFetch<any>(`${API_URL}/review/${testItemId}`, token, {
		method: "PATCH",
	});
};

// =============================================================
// 🧾 Release Report
// =============================================================
export const releaseReport = async (
	token: string,
	requestId: number
): Promise<any> => {
	return apiFetch<any>(`${API_URL}/release/${requestId}`, token, {
		method: "POST",
	});
};

// =============================================================
// 🔬 Analyzer Integration
// =============================================================
export const getAnalyzerResults = async (
	token: string,
	testItemId: number
): Promise<AnalyzerResults> => {
	try {
		return await apiFetch<AnalyzerResults>(
			`${API_URL}/items/${testItemId}/analyzer-results`,
			token
		);
	} catch (error: any) {
		if (error.status === 404) {
			return {
				test_item_id: testItemId,
				instrument: null,
				sample_id: null,
				results: {},
				analyzer_meta: null,
				updated_at: new Date(0).toISOString(),
			};
		}
		throw error;
	}
};

export const adoptAnalyzerResults = async (
	token: string,
	testItemId: number,
	options: { overwrite?: boolean } = {}
): Promise<any> => {
	const overwrite = options.overwrite ?? true;
	const url = `${API_URL}/items/${testItemId}/adopt-analyzer?overwrite=${overwrite}`;
	return apiFetch<any>(url, token, { method: "POST" });
};

// =============================================================
// 🔁 Update Request Status (Main Request Header Status)
// =============================================================
export const updateRequestStatus = async (
	requestId: number,
	newStatus: string,
	token: string
): Promise<any> => {
	if (!requestId || !newStatus) {
		throw new Error("Missing requestId or status");
	}

	// This endpoint targets the MAIN request header status (test_requests table)
	return apiFetch<any>(`${REQUEST_API}/${requestId}`, token, {
		method: "PUT",
		body: JSON.stringify({ status: newStatus }),
	});
};

// =============================================================
// 🆕 FIX: Update Individual Test Item Status (CRITICAL FIX FOR PANELS)
// =============================================================
export const updateRequestItemStatus = async (
	testItemId: number,
	newStatus: string,
	token: string
): Promise<any> => {
	if (!testItemId || !newStatus) {
		throw new Error("Missing testItemId or status");
	}

	// This calls the dedicated endpoint on the pathologist controller
	return apiFetch<any>(`${API_URL}/item-status/${testItemId}`, token, {
		method: "PUT",
		body: JSON.stringify({ status: newStatus }),
	});
};

// =============================================================
// 🧠 Export Default (Updated)
// =============================================================
const pathologistService = {
	// Core
	getWorklist,
	getResults,
	getStatusCounts,
	getResultTemplate,
	submitResult,
	getResultHistory,

	// Actions
	verifyResult,
	reopenResult,
	markForReview,
	releaseReport,
	updateRequestStatus,
	updateRequestItemStatus, // <<< NEW EXPORT

	// Analyzer
	getAnalyzerResults,
	adoptAnalyzerResults,
};

export default pathologistService;