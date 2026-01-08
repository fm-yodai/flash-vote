<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  QuestionType as questionTypeValues,
  type HostRoomDetailResponse,
  type QuestionType as QuestionTypeValue,
} from "shared";

const roomId = computed(() => window.location.pathname.split("/")[2] ?? "");
const tokenKey = computed(() => `fv_host_token:${roomId.value}`);

const loading = ref(false);
const errorMessage = ref("");
const statusMessage = ref("");

const room = ref<HostRoomDetailResponse["room"] | null>(null);
const questions = ref<HostRoomDetailResponse["questions"]>([]);
const guestCount = ref<HostRoomDetailResponse["guestCount"]>({
  active: 0,
  total: 0,
});

const roomTitle = ref("");
const roomPurpose = ref("");

const newQuestionType = ref<QuestionTypeValue>("single_choice");
const newQuestionPrompt = ref("");
const newQuestionOptions = ref("");

const promptEdits = reactive<Record<string, string>>({});
const optionEdits = reactive<Record<string, string>>({});

const authToken = ref<string | null>(null);

const publicUrl = computed(() => {
  if (!room.value || room.value.status !== "published") {
    return "";
  }
  return `${window.location.origin}/r/${roomId.value}`;
});
const qrCodeUrl = computed(() => {
  if (!publicUrl.value) {
    return "";
  }
  const encoded = encodeURIComponent(publicUrl.value);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
});

const ensureToken = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    localStorage.setItem(tokenKey.value, token);
    params.delete("token");
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }
  authToken.value = localStorage.getItem(tokenKey.value);
  if (!authToken.value) {
    errorMessage.value = "Host tokenが見つかりません。URLのtoken付きでアクセスしてください。";
  }
};

const parseOptions = (value: string) =>
  value
    .split("\n")
    .map((option) => option.trim())
    .filter((option) => option.length > 0);

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  `${window.location.protocol}//${window.location.hostname}:3000`;

const apiFetch = async (input: string, init?: RequestInit) => {
  if (!authToken.value) {
    throw new Error("Host tokenがありません。");
  }
  const url = new URL(input, apiBaseUrl).toString();
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${authToken.value}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    throw new Error(`APIに接続できません (${detail}). VITE_API_BASE_URL: ${apiBaseUrl}`);
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const errorBody = await response.json();
      message = errorBody?.error?.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return response;
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("API応答がJSONではありません。API_BASE_URLの設定を確認してください。");
  }
  return response;
};

const loadRoom = async () => {
  if (!authToken.value || !roomId.value) {
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  try {
    const response = await apiFetch(`/api/host/rooms/${roomId.value}`);
    const data = (await response.json()) as HostRoomDetailResponse;
    room.value = data.room;
    questions.value = data.questions;
    guestCount.value = data.guestCount;
    roomTitle.value = data.room.title ?? "";
    roomPurpose.value = data.room.purposeText ?? "";
    for (const question of data.questions) {
      promptEdits[question.id] = question.prompt;
      optionEdits[question.id] =
        question.type === "text"
          ? ""
          : question.options.map((option) => option.label).join("\n");
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "読み込みに失敗しました。";
  } finally {
    loading.value = false;
  }
};

const updateRoom = async () => {
  if (!room.value) {
    return;
  }
  statusMessage.value = "";
  try {
    await apiFetch(`/api/host/rooms/${room.value.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: roomTitle.value,
        purposeText: roomPurpose.value,
      }),
    });
    statusMessage.value = "ルーム情報を更新しました。";
    await loadRoom();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "更新に失敗しました。";
  }
};

const publishRoom = async () => {
  if (!room.value) {
    return;
  }
  statusMessage.value = "";
  try {
    await apiFetch(`/api/host/rooms/${room.value.id}/publish`, { method: "POST" });
    statusMessage.value = "ルームを公開しました。";
    await loadRoom();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "公開に失敗しました。";
  }
};

const unpublishRoom = async () => {
  if (!room.value) {
    return;
  }
  statusMessage.value = "";
  try {
    await apiFetch(`/api/host/rooms/${room.value.id}/unpublish`, { method: "POST" });
    statusMessage.value = "ルームを非公開にしました。";
    await loadRoom();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "非公開に失敗しました。";
  }
};

const createQuestion = async () => {
  if (!room.value) {
    return;
  }
  statusMessage.value = "";
  try {
    const options = newQuestionType.value === "text" ? undefined : parseOptions(newQuestionOptions.value);
    await apiFetch(`/api/host/rooms/${room.value.id}/questions`, {
      method: "POST",
      body: JSON.stringify({
        type: newQuestionType.value,
        prompt: newQuestionPrompt.value,
        options,
      }),
    });
    statusMessage.value = "質問を追加しました。";
    newQuestionPrompt.value = "";
    newQuestionOptions.value = "";
    await loadRoom();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "追加に失敗しました。";
  }
};

const saveQuestion = async (questionId: string) => {
  statusMessage.value = "";
  try {
    const question = questions.value.find((item) => item.id === questionId);
    if (!question) {
      return;
    }
    const options =
      question.type === "text" ? undefined : parseOptions(optionEdits[questionId] ?? "");
    await apiFetch(`/api/host/questions/${questionId}`, {
      method: "PATCH",
      body: JSON.stringify({
        prompt: promptEdits[questionId],
        options,
      }),
    });
    statusMessage.value = "質問を更新しました。";
    await loadRoom();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "更新に失敗しました。";
  }
};

const deleteQuestion = async (questionId: string) => {
  if (!confirm("この質問を削除しますか？")) {
    return;
  }
  statusMessage.value = "";
  try {
    await apiFetch(`/api/host/questions/${questionId}`, { method: "DELETE" });
    statusMessage.value = "質問を削除しました。";
    await loadRoom();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "削除に失敗しました。";
  }
};

onMounted(() => {
  ensureToken();
  loadRoom();
});

</script>

<template>
  <section class="host-room">
    <header>
      <h1>Host Console</h1>
      <p v-if="room">Room ID: {{ room.id }}</p>
      <p v-if="room">Status: {{ room.status }}</p>
      <p v-if="room">Guests: {{ guestCount.active }} / {{ guestCount.total }}</p>
    </header>

    <div v-if="errorMessage" class="alert error">{{ errorMessage }}</div>
    <div v-if="statusMessage" class="alert success">{{ statusMessage }}</div>

    <div v-if="loading" class="loading">読み込み中...</div>

    <div v-if="room" class="panel">
      <h2>ルーム情報</h2>
      <label>
        タイトル
        <input v-model="roomTitle" type="text" maxlength="100" />
      </label>
      <label>
        目的
        <textarea v-model="roomPurpose" rows="2"></textarea>
      </label>
      <div class="actions">
        <button type="button" @click="updateRoom">保存</button>
        <button
          v-if="room.status === 'draft'"
          type="button"
          class="primary"
          @click="publishRoom"
        >
          公開する
        </button>
        <button
          v-if="room.status === 'published'"
          type="button"
          class="secondary"
          @click="unpublishRoom"
        >
          非公開に戻す
        </button>
      </div>
    </div>

    <div v-if="publicUrl" class="panel">
      <h2>公開URL</h2>
      <p class="public-url">{{ publicUrl }}</p>
      <div v-if="qrCodeUrl" class="qr">
        <img :src="qrCodeUrl" alt="公開URLのQR" />
      </div>
    </div>

    <div v-if="room" class="panel">
      <h2>質問を追加</h2>
      <label>
        種類
        <select v-model="newQuestionType">
          <option v-for="type in questionTypeValues" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
      </label>
      <label>
        質問文
        <input v-model="newQuestionPrompt" type="text" maxlength="200" />
      </label>
      <label v-if="newQuestionType !== 'text'">
        選択肢（改行区切り）
        <textarea v-model="newQuestionOptions" rows="3"></textarea>
      </label>
      <button type="button" class="primary" @click="createQuestion">追加</button>
    </div>

    <div v-if="room" class="panel">
      <h2>質問一覧</h2>
      <div v-if="questions.length === 0" class="empty">まだ質問がありません。</div>
      <div v-for="question in questions" :key="question.id" class="question-card">
        <div class="question-header">
          <span>Q{{ question.order + 1 }} ({{ question.type }})</span>
          <span class="status">{{ question.status }}</span>
        </div>
        <label>
          質問文
          <input v-model="promptEdits[question.id]" type="text" maxlength="200" />
        </label>
        <label v-if="question.type !== 'text'">
          選択肢（改行区切り）
          <textarea v-model="optionEdits[question.id]" rows="3"></textarea>
        </label>
        <div class="actions">
          <button type="button" @click="saveQuestion(question.id)">更新</button>
          <button type="button" class="danger" @click="deleteQuestion(question.id)">削除</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.host-room {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

header h1 {
  margin-bottom: 0.25rem;
}

.panel {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-weight: 600;
  color: #0f172a;
}

input,
textarea,
select {
  border-radius: 8px;
  border: 1px solid #cbd5f5;
  padding: 0.6rem 0.75rem;
  font-size: 0.95rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

button.primary {
  background: #3b82f6;
  color: #ffffff;
  border: none;
}

button.secondary {
  background: #f59e0b;
  color: #ffffff;
  border: none;
}

button.danger {
  background: #ef4444;
  color: #ffffff;
  border: none;
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 8px;
}

.alert.error {
  background: #fee2e2;
  color: #991b1b;
}

.alert.success {
  background: #dcfce7;
  color: #166534;
}

.loading {
  font-weight: 600;
}

.public-url {
  font-family: "SFMono-Regular", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
  background: #f1f5f9;
  padding: 0.6rem;
  border-radius: 8px;
  word-break: break-all;
}

.qr img {
  width: 200px;
  height: 200px;
}

.question-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-header {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
}

.status {
  font-size: 0.85rem;
  color: #64748b;
}

.empty {
  color: #64748b;
}
</style>
