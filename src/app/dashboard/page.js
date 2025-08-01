"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadError, setUploadError] = useState("");
    const [uploadSuccess, setUploadSuccess] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [documents, setDocuments] = useState([]);
    const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

    const [showChunksModal, setShowChunksModal] = useState(false);
    const [chunksModalContent, setChunksModalContent] = useState("");
    const [chunksModalTitle, setChunksModalTitle] = useState("");
    const [isModalLoading, setIsModalLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push("/");
            }
        });

        return () => unsubscribe();
    }, [router]);

    const loadUserDocuments = async (userId) => {
        if (!API_BASE_URL) {
            console.error("API_BASE_URL is not defined.");
            return;
        }
        setIsLoadingDocuments(true);
        try {
            const response = await fetch(`${API_BASE_URL}/users/${userId}/documents`);
            if (response.ok) {
                const data = await response.json();
                setDocuments(data.documents || []);
            } else {
                console.error("Failed to load documents");
            }
        } catch (error) {
            console.error("Error loading documents:", error);
        } finally {
            setIsLoadingDocuments(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validTypes = ["application/pdf", "text/plain"];
        if (!validTypes.includes(file.type)) {
            setUploadError("Only PDF and TXT files are allowed.");
            setSelectedFile(null);
        } else {
            setSelectedFile(file);
            setUploadError("");
            setUploadSuccess("");
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            const validTypes = ["application/pdf", "text/plain"];

            if (!validTypes.includes(file.type)) {
                setUploadError("Only PDF and TXT files are allowed.");
                setSelectedFile(null);
            } else {
                setSelectedFile(file);
                setUploadError("");
                setUploadSuccess("");
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !user) {
            setUploadError(
                "Please select a valid file and ensure you are logged in."
            );
            return;
        }

        setIsUploading(true);
        setUploadError("");
        setUploadSuccess("");

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("user_id", "u1");
            formData.append("email", "himanshu.khojpur@gmail.com");

            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setUploadSuccess(
                    `File uploaded successfully! Document ID: ${data.document_id}`
                );
                setSelectedFile(null);
                const fileInput = document.getElementById("file-upload");
                if (fileInput) fileInput.value = "";

                await loadUserDocuments(user.uid);

                router.push(`/chat?documentId=${data.document_id}`);
            } else {
                setUploadError(data.error || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            setUploadError("Network error. Please check if the backend is running.");
        } finally {
            setIsUploading(false);
        }
    };

    const chatWithDocument = (documentId) => {
        router.push(`/chat?documentId=${documentId}`);
    };

    const viewDocumentChunks = async (documentId, fileName) => {
        if (!API_BASE_URL) {
            setChunksModalTitle("Error");
            setChunksModalContent("API Base URL is not configured.");
            setShowChunksModal(true);
            return;
        }

        setIsModalLoading(true);
        setChunksModalTitle(`Chunks for "${fileName}"`);
        setChunksModalContent("Loading chunks...");
        setShowChunksModal(true);

        try {
            const response = await fetch(
                `${API_BASE_URL}/documents/${documentId}/chunks`
            );
            if (response.ok) {
                const data = await response.json();
                if (data.chunks && data.chunks.length > 0) {
                    const formattedChunks = data.chunks
                        .map(
                            (chunk, index) =>
                                `- **Chunk ${index + 1}:**\n  \`\`\`\n${chunk}\n\`\`\`\n`
                        )
                        .join("\n");
                    setChunksModalContent(formattedChunks);
                } else {
                    setChunksModalContent("No chunks found for this document.");
                }
            } else {
                setChunksModalContent("Failed to load chunks.");
                console.error("Failed to fetch chunks:", await response.text());
            }
        } catch (error) {
            console.error("Error fetching chunks:", error);
            setChunksModalContent("Error fetching chunks. Please try again.");
        } finally {
            setIsModalLoading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const Modal = ({ show, title, content, onClose, isLoading }) => {
        if (!show) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-white">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto text-gray-200 markdown-content">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-6 h-6 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
                                <span className="ml-3 text-gray-400">Loading...</span>
                            </div>
                        ) : (
                            <pre className="whitespace-pre-wrap font-mono text-sm break-words">
                                {content}
                            </pre>
                        )}
                    </div>
                    <div className="p-4 border-t border-gray-700 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };


    return (

        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white">

            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>

            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>



            <div className="relative z-10 flex justify-between items-center p-6 lg:p-8">

                <div className="flex items-center space-x-3">

                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">

                        <svg

                            className="w-5 h-5 text-white"

                            fill="none"

                            stroke="currentColor"

                            viewBox="0 0 24 24"

                        >

                            <path

                                strokeLinecap="round"

                                strokeLinejoin="round"

                                strokeWidth={2}

                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"

                            />

                        </svg>

                    </div>

                    <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">

                        Docsy

                    </h1>

                </div>



                <button

                    onClick={() => signOut(auth)}

                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors duration-200 hover:bg-white/10 rounded-lg"

                >

                    <svg

                        className="w-4 h-4"

                        fill="none"

                        stroke="currentColor"

                        viewBox="0 0 24 24"

                    >

                        <path

                            strokeLinecap="round"

                            strokeLinejoin="round"

                            strokeWidth={2}

                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"

                        />

                    </svg>

                    <span>Sign Out</span>

                </button>

            </div>



            <div className="relative z-10 flex flex-col items-center px-6 lg:px-8 pb-20">

                <div className="text-center mb-12">

                    <h2 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">

                        Welcome back

                    </h2>

                    <p className="text-xl text-gray-300 mb-2">{user?.email}</p>

                    <p className="text-gray-400">Upload your documents to get started</p>

                </div>



                <div className="w-full max-w-6xl space-y-8">

                    <div className="w-full max-w-lg mx-auto">

                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

                            <div className="flex items-center space-x-3 mb-6">

                                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">

                                    <svg

                                        className="w-5 h-5 text-white"

                                        fill="none"

                                        stroke="currentColor"

                                        viewBox="0 0 24 24"

                                    >

                                        <path

                                            strokeLinecap="round"

                                            strokeLinejoin="round"

                                            strokeWidth={2}

                                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"

                                        />

                                    </svg>

                                </div>

                                <h3 className="text-xl font-semibold text-white">

                                    Upload Document

                                </h3>

                            </div>



                            <div

                                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${dragActive

                                    ? "border-purple-400 bg-purple-500/10"

                                    : "border-gray-600 hover:border-gray-500"

                                    }`}

                                onDragEnter={handleDrag}

                                onDragLeave={handleDrag}

                                onDragOver={handleDrag}

                                onDrop={handleDrop}

                            >

                                <input

                                    type="file"

                                    accept=".pdf,.txt"

                                    onChange={handleFileChange}

                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"

                                    id="file-upload"

                                />



                                <div className="space-y-4">

                                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto">

                                        <svg

                                            className="w-8 h-8 text-purple-400"

                                            fill="none"

                                            stroke="currentColor"

                                            viewBox="0 0 24 24"

                                        >

                                            <path

                                                strokeLinecap="round"

                                                strokeLinejoin="round"

                                                strokeWidth={2}

                                                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"

                                            />

                                        </svg>

                                    </div>



                                    <div>

                                        <p className="text-lg font-medium text-white mb-2">

                                            {dragActive

                                                ? "Drop your file here"

                                                : "Drag & drop your file here"}

                                        </p>

                                        <p className="text-gray-400 text-sm">

                                            or{" "}

                                            <label

                                                htmlFor="file-upload"

                                                className="text-purple-400 hover:text-purple-300 cursor-pointer font-medium"

                                            >

                                                browse files

                                            </label>

                                        </p>

                                        <p className="text-xs text-gray-500 mt-3">

                                            Supports PDF and TXT files

                                        </p>

                                    </div>

                                </div>

                            </div>



                            {selectedFile && (

                                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex justify-between items-center">

                                    <div className="flex items-center space-x-3">

                                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">

                                            <svg

                                                className="w-5 h-5 text-green-400"

                                                fill="none"

                                                stroke="currentColor"

                                                viewBox="0 0 24 24"

                                            >

                                                <path

                                                    strokeLinecap="round"

                                                    strokeLinejoin="round"

                                                    strokeWidth={2}

                                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"

                                                />

                                            </svg>

                                        </div>

                                        <div className="flex-1 min-w-0">

                                            <p className="text-sm font-medium text-green-400 truncate">

                                                {selectedFile.name}

                                            </p>

                                            <p className="text-xs text-gray-400">

                                                {formatFileSize(selectedFile.size)}

                                            </p>

                                        </div>

                                    </div>

                                    <button

                                        onClick={() => {

                                            setSelectedFile(null);

                                            setUploadError("");

                                            setUploadSuccess("");

                                            const fileInput = document.getElementById("file-upload");

                                            if (fileInput) fileInput.value = "";

                                        }}

                                        className="ml-4 text-sm text-red-400 hover:text-red-300 transition"

                                        title="Remove file"

                                    >

                                        ✕

                                    </button>

                                </div>

                            )}



                            {uploadSuccess && (

                                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">

                                    <div className="flex items-center space-x-2">

                                        <svg

                                            className="w-5 h-5 text-green-400"

                                            fill="none"

                                            stroke="currentColor"

                                            viewBox="0 0 24 24"

                                        >

                                            <path

                                                strokeLinecap="round"

                                                strokeLinejoin="round"

                                                strokeWidth={2}

                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"

                                            />

                                        </svg>

                                        <p className="text-sm text-green-400">{uploadSuccess}</p>

                                    </div>

                                </div>

                            )}



                            {uploadError && (

                                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">

                                    <div className="flex items-center space-x-2">

                                        <svg

                                            className="w-5 h-5 text-red-400"

                                            fill="none"

                                            stroke="currentColor"

                                            viewBox="0 0 24 24"

                                        >

                                            <path

                                                strokeLinecap="round"

                                                strokeLinejoin="round"

                                                strokeWidth={2}

                                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"

                                            />

                                        </svg>

                                        <p className="text-sm text-red-400">{uploadError}</p>

                                    </div>

                                </div>

                            )}



                            <button

                                onClick={handleUpload}

                                disabled={!selectedFile || isUploading}

                                className={`w-full mt-6 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${selectedFile && !isUploading

                                    ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-purple-500/25"

                                    : "bg-gray-700 text-gray-400 cursor-not-allowed"

                                    }`}

                            >

                                {isUploading ? (

                                    <div className="flex items-center justify-center space-x-2">

                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>

                                        <span>Uploading...</span>

                                    </div>

                                ) : (

                                    <div className="flex items-center justify-center space-x-2">

                                        <svg

                                            className="w-5 h-5"

                                            fill="none"

                                            stroke="currentColor"

                                            viewBox="0 0 24 24"

                                        >

                                            <path

                                                strokeLinecap="round"

                                                strokeLinejoin="round"

                                                strokeWidth={2}

                                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"

                                            />

                                        </svg>

                                        <span>Upload File</span>

                                    </div>

                                )}

                            </button>

                        </div>

                    </div>



                    {documents.length > 0 && (

                        <div className="w-full">

                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

                                <div className="flex items-center space-x-3 mb-6">

                                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">

                                        <svg

                                            className="w-5 h-5 text-white"

                                            fill="none"

                                            stroke="currentColor"

                                            viewBox="0 0 24 24"

                                        >

                                            <path

                                                strokeLinecap="round"

                                                strokeLinejoin="round"

                                                strokeWidth={2}

                                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"

                                            />

                                        </svg>

                                    </div>

                                    <h3 className="text-xl font-semibold text-white">

                                        Your Documents

                                    </h3>

                                    <span className="text-sm text-gray-400">

                                        ({documents.length}{" "}

                                        {documents.length === 1 ? "document" : "documents"})

                                    </span>

                                </div>



                                {isLoadingDocuments ? (

                                    <div className="flex items-center justify-center py-8">

                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>

                                        <span className="ml-3 text-gray-400">

                                            Loading documents...

                                        </span>

                                    </div>

                                ) : (

                                    <div className="space-y-4">

                                        {documents.map((doc) => (

                                            <div

                                                key={doc.id}

                                                className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"

                                            >

                                                <div className="flex items-center space-x-4">

                                                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">

                                                        <svg

                                                            className="w-5 h-5 text-blue-400"

                                                            fill="none"

                                                            stroke="currentColor"

                                                            viewBox="0 0 24 24"

                                                        >

                                                            <path

                                                                strokeLinecap="round"

                                                                strokeLinejoin="round"

                                                                strokeWidth={2}

                                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"

                                                            />

                                                        </svg>

                                                    </div>

                                                    <div>

                                                        <p className="text-white font-medium">

                                                            {doc.file_name}

                                                        </p>

                                                        <p className="text-gray-400 text-sm">

                                                            Uploaded on {formatDate(doc.uploaded_at)}

                                                        </p>

                                                    </div>

                                                </div>

                                                <div className="flex space-x-2">

                                                    <button

                                                        onClick={() => chatWithDocument(doc.id)}

                                                        className="px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"

                                                    >

                                                        <svg

                                                            className="w-4 h-4"

                                                            fill="none"

                                                            stroke="currentColor"

                                                            viewBox="0 0 24 24"

                                                        >

                                                            <path

                                                                strokeLinecap="round"

                                                                strokeLinejoin="round"

                                                                strokeWidth={2}

                                                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"

                                                            />

                                                        </svg>

                                                        <span>Chat</span>

                                                    </button>

                                                    <button

                                                        onClick={() =>

                                                            viewDocumentChunks(doc.id, doc.file_name)

                                                        }

                                                        className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"

                                                    >

                                                        View Chunks

                                                    </button>

                                                </div>

                                            </div>

                                        ))}

                                    </div>

                                )}

                            </div>

                        </div>

                    )}

                </div>

            </div>



            <Modal

                show={showChunksModal}

                title={chunksModalTitle}

                content={chunksModalContent}

                onClose={() => setShowChunksModal(false)}

                isLoading={isModalLoading}

            />

        </div>

    );

}
