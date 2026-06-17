/**
 * ChronoSystem Navi V2 - Main Application Logic (Fix 1.2)
 * ・データ正規化の堅牢化（数値型対応）
 * ・検索結果の追加読み込み（ページネーション）実装
 */

const App = {
    navigator: null,


    Settings: {
        data: {
            isTabletMode: true,
            isLiteMode: false,
            serverIp: "192.168.1.20",
            serverPort: "8080"
        },
        load: function () {
            const saved = localStorage.getItem('csnavi_settings');
            if (saved) {
                this.data = JSON.parse(saved);
                App.Network.config.ip = this.data.serverIp;
                App.Network.config.port = this.data.serverPort;
            }
            this.apply();
        },
        save: function () {
            localStorage.setItem('csnavi_settings', JSON.stringify(this.data));
            App.Network.config.ip = this.data.serverIp;
            App.Network.config.port = this.data.serverPort;
        },
        apply: function() {
            if (this.data.isTabletMode) {
                document.body.classList.add('tablet-mode');
            } else {
                document.body.classList.remove('tablet-mode');
            }
        }
    },

    // ▼▼▼ 履歴管理モジュール ▼▼▼
    History: {
        data: [],
        MAX_COUNT: 1000,

        load: function () {
            const saved = localStorage.getItem('csnavi_history');
            this.data = saved ? JSON.parse(saved) : [];
            return this.data;
        },
        save: function () {
            localStorage.setItem('csnavi_history', JSON.stringify(this.data));
        },
        add: function (song) {
            // 必要な情報だけを抽出して保存
            const entry = {
                request_number: song.request_number,
                title: song.title || "不明な楽曲",
                artist: song.artist || "",
                type_code: song.type_code || "01",
                timestamp: Date.now()
            };

            // 重複チェック（同じ番号があれば削除して先頭へ）
            this.data = this.data.filter(item => item.request_number !== entry.request_number);
            this.data.unshift(entry);

            // 100件上限
            if (this.data.length > this.MAX_COUNT) {
                this.data = this.data.slice(0, this.MAX_COUNT);
            }
            this.save();
        },
        clear: function () {
            this.data = [];
            this.save();
        }
    },

    // ▼▼▼ エラーログ管理モジュール ▼▼▼
    ErrorLog: {
        data: [],

        load: function () {
            const saved = localStorage.getItem('csnavi_errorlog');
            this.data = saved ? JSON.parse(saved) : [];
            return this.data;
        },
        save: function () {
            localStorage.setItem('csnavi_errorlog', JSON.stringify(this.data));
        },
        add: function (song, reason) {
            const entry = {
                request_number: song.request_number,
                title: song.title || "不明な楽曲",
                artist: song.artist || "",
                type_code: song.type_code || "01",
                model_code: song.model_code || "",
                reason: reason,
                timestamp: Date.now()
            };
            this.data.unshift(entry); // 新しいものを先頭へ
            this.save();
        },
        clear: function () {
            this.data = [];
            this.save();
        }
    },

    // ▼▼▼ 新お気に入り管理モジュール ▼▼▼
    NewFavorites: {
        data: [],

        load: function () {
            const saved = localStorage.getItem('csnavi_new_favorites');
            this.data = saved ? JSON.parse(saved) : [];
            return this.data;
        },
        save: function () {
            localStorage.setItem('csnavi_new_favorites', JSON.stringify(this.data));
        },
        add: function (song) {
            const entry = {
                request_number: song.request_number,
                title: song.title || "不明な楽曲",
                artist: song.artist || "",
                type_code: song.type_code || "01",
                timestamp: Date.now()
            };
            // 既に登録済みなら削除して先頭に追加
            this.data = this.data.filter(item => item.request_number !== entry.request_number);
            this.data.unshift(entry);
            this.save();
        },
        remove: function (request_number) {
            this.data = this.data.filter(item => item.request_number !== request_number);
            this.save();
        },
        clear: function () {
            this.data = [];
            this.save();
        }
    },

    Data: {
        songs: [],
        models: {}, // 機種ごとの説明文データを格納
        musicTypes: {}, // 曲タイプごとの説明文データを格納
        genres: [
            { id: '02', name: '本人映像', type: 'artist_filter', filterCodes: ['02', '03', '08', '10'] },
            { id: '03', name: 'LIVE映像', type: 'artist_filter', filterCodes: ['03'] },
            { id: '10', name: 'LIVE歌唱', type: 'artist_filter', filterCodes: ['10'] },
            { id: '04', name: 'アニメ映像', type: 'anime_title', filterCodes: ['04'] },
            { id: '11', name: 'アニソン', type: 'anime_title', filterCodes: null },
            { id: '22', name: '合成音声楽曲', type: 'direct_keyword', keyword: 'VOCALOID' },
            { id: '12', name: 'VOCALOID 初音ミク', type: 'direct_keyword', keyword: '初音ミク' },
            { id: '13', name: 'VOCALOID 巡音ルカ', type: 'direct_keyword', keyword: '巡音ルカ' },
            { id: '14', name: 'VOCALOID 鏡音リン', type: 'direct_keyword', keyword: '鏡音リン' },
            { id: '15', name: 'VOCALOID 鏡音レン', type: 'direct_keyword', keyword: '鏡音レン' },
            { id: '16', name: 'VOCALOID 結月ゆかり', type: 'direct_keyword', keyword: '結月ゆかり' },
            { id: '17', name: 'VOCALOID IA', type: 'direct_keyword', keyword: 'IA' },
            { id: '18', name: 'VOCALOID Megpoid', type: 'direct_keyword', keyword: 'GUMI' },
            { id: '19', name: 'VOCALOID flower', type: 'direct_keyword', keyword: 'flower' },
            { id: '20', name: 'UTAU 重音テト', type: 'direct_keyword', keyword: '重音テト' },
            { id: '21', name: 'CeVIO AI 可不', type: 'direct_keyword', keyword: '可不' }
        ],
        csSelect: [],
        banner01: [],
        banner02: [],
        banner03: [],
        isInitialized: false,
        lastUpdateDate: "--",
        version: "v2.0.2",

        init: function () {
            if (this.isInitialized) return;
            App.UI.showLoading("データベース読み込み中...");

            const pCsv = new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("GET", "csv/db.csv", true);
                xhr.overrideMimeType("text/csv; charset=utf-8");
                xhr.onload = () => {
                    if (xhr.status === 200 || xhr.status === 0) {
                        Papa.parse(xhr.responseText, {
                            header: true,
                            skipEmptyLines: true,
                            dynamicTyping: false,
                            complete: (results) => {
                                this.songs = results.data.map(song => {
                                    const clean = (val) => {
                                        if (val === null || val === undefined) return '';
                                        const s = String(val).trim();
                                        return (s.toLowerCase() === 'nan') ? '' : s;
                                    };
                                    const cleanedSong = {};
                                    Object.keys(song).forEach(key => { cleanedSong[key] = clean(song[key]); });
                                    if (cleanedSong.genre_code) cleanedSong.genre_code = String(cleanedSong.genre_code).padStart(2, '0');
                                    if (cleanedSong.type_code) cleanedSong.type_code = String(cleanedSong.type_code).padStart(2, '0');
                                    if (cleanedSong.model_code) cleanedSong.model_code = String(cleanedSong.model_code).padStart(3, '0');
                                    return cleanedSong;
                                });
                                resolve();
                            },
                            error: (err) => reject(err)
                        });
                    } else {
                        reject("DBファイルが見つかりません (csv/db.csv)");
                    }
                };
                xhr.onerror = () => reject("DB読み込みエラー");
                xhr.send();
            });

            const pModels = fetch('csv/models.json')
                .then(res => res.json())
                .then(data => { this.models = data; })
                .catch(err => { console.warn('models.json load failed', err); });

            const pMusicTypes = fetch('csv/musictype.json')
                .then(res => res.json())
                .then(data => { this.musicTypes = data; })
                .catch(err => { console.warn('musictype.json load failed', err); });

            const fetchList = (filename, propName) => fetch(`csv/${filename}.json`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        this[propName] = data;
                    } else if (data && Array.isArray(data.data)) {
                        this[propName] = data.data;
                    } else {
                        this[propName] = [];
                    }
                })
                .catch(err => { console.warn(`${filename}.json load failed`, err); this[propName] = []; });

            const pCsSelect = fetchList('csselect', 'csSelect');
            const pB1 = fetchList('banner01', 'banner01');
            const pB2 = fetchList('banner02', 'banner02');
            const pB3 = fetchList('banner03', 'banner03');

            return Promise.all([pCsv, pModels, pMusicTypes, pCsSelect, pB1, pB2, pB3]).then(() => {
                this.isInitialized = true;
                this.lastUpdateDate = "2026/01/29";
                console.log(`DB Loaded: ${this.songs.length} songs. Models Loaded: ${Object.keys(this.models).length}. MusicTypes Loaded: ${Object.keys(this.musicTypes).length}. CSSelect Loaded: ${this.csSelect.length}`);
                App.UI.updateFooterInfo();
                App.UI.hideLoading();
                ons.notification.toast(`準備完了 Rel.${this.lastUpdateDate}`, { timeout: 2000 });
            }).catch(err => {
                App.UI.handleError(err);
            });
        },

        // 曲タイプの優先順位定義
        typePriority: { "02": 1, "08": 2, "04": 3, "03": 4, "10": 5, "06": 6, "01": 7, "00": 8, "05": 9, "07": 10, "09": 11 },

        // 検索機能
        search: function (query, type, keyboardMode) {
            if (!query || this.songs.length === 0) return [];

            let targetQuery = query;
            if (keyboardMode === 'kana' || type === 'keyword') {
                targetQuery = this.normalizeToHalfWidthKana(query);
            }

            if (type === 'artist') {
                // 歌手名検索：マッチする楽曲からユニークな歌手名を抽出し、カナ順でソート
                const q = targetQuery.toLowerCase();
                const matchedSongs = this.songs.filter(s => {
                    const val = (s.artist || '');
                    const kana = (s.artist_kana || '');
                    if (keyboardMode === 'kana') {
                        return kana.startsWith(targetQuery);
                    } else {
                        return val.toLowerCase().replace(/^\[.*?\]/, '').startsWith(q);
                    }
                });

                // LiteモードがONの場合はlite===1の曲を除外
                const isLiteMode = App.Settings.data.isLiteMode;
                const filteredMatchedSongs = isLiteMode ? matchedSongs.filter(s => s.lite !== "1") : matchedSongs;

                // 歌手名とカナをペアにしてユニーク化
                const artistMap = new Map(); // artist -> artist_kana
                filteredMatchedSongs.forEach(s => {
                    if (!artistMap.has(s.artist)) {
                        artistMap.set(s.artist, s.artist_kana);
                    }
                });

                return Array.from(artistMap.entries())
                    .sort((a, b) => a[1].localeCompare(b[1], 'ja')) // カナでソート
                    .map(entry => entry[0]);
            }

            // 楽曲検索（曲名、キーワード、ジャンル、タイプ等）
            const results = this.songs.filter(song => {
                const getVal = (col) => song[col] || '';

                if (type === 'keyword') {
                    const q = targetQuery;
                    const origQ = query.toLowerCase();
                    const check = (val) => {
                        const str = val.toLowerCase();
                        return str.includes(origQ) || this.normalizeToHalfWidthKana(str).includes(q);
                    };
                    return check(getVal('remarks1')) || check(getVal('remarks1_kana')) ||
                        check(getVal('remarks2')) || check(getVal('remarks2_kana')) ||
                        check(getVal('title')) || check(getVal('subtitle')) || check(getVal('artist'));
                } else if (type === 'genre') {
                    return getVal('genre_code') === query;
                } else if (type === 'song_type') {
                    return getVal('type_code') === query;
                } else if (type === 'release_year') {
                    return getVal('release_year') === query;
                } else if (type === 'number') {
                    return getVal('request_number') === query;
                } else if (keyboardMode === 'kana') {
                    const col = (type === 'song_title') ? 'title_kana' : 'artist_kana';
                    return getVal(col).startsWith(targetQuery);
                } else {
                    const col = (type === 'song_title') ? 'title' : 'artist';
                    let text = getVal(col).replace(/^\[.*?\]/, '');
                    return text.toLowerCase().startsWith(query.toLowerCase());
                }
            });

            // LiteモードがONの場合はlite===1の曲を除外
            const isLiteMode = App.Settings.data.isLiteMode;
            const filteredResults = isLiteMode ? results.filter(s => s.lite !== "1") : results;

            // ソートルールの適用
            return filteredResults.sort((a, b) => {
                // 1. カナ順
                const kanaA = a.title_kana || '';
                const kanaB = b.title_kana || '';
                if (kanaA !== kanaB) return kanaA.localeCompare(kanaB, 'ja');

                // 2. 曲タイプ優先度
                const pA = this.typePriority[a.type_code] || 99;
                const pB = this.typePriority[b.type_code] || 99;
                if (pA !== pB) return pA - pB;

                // 3. 選曲番号順
                return a.request_number.localeCompare(b.request_number);
            });
        },

        // 半角カナ正規化
        normalizeToHalfWidthKana: function (str) {
            if (!str) return '';
            let katakana = str.replace(/[\u3041-\u3096]/g, m => String.fromCharCode(m.charCodeAt(0) + 0x60));
            const map = {
                'ガ': 'ｶﾞ', 'ギ': 'ｷﾞ', 'グ': 'ｸﾞ', 'ゲ': 'ｹﾞ', 'ゴ': 'ｺﾞ', 'ザ': 'ｻﾞ', 'ジ': 'ｼﾞ', 'ズ': 'ｽﾞ', 'ゼ': 'ｾﾞ', 'ゾ': 'ｿﾞ', 'ダ': 'ﾀﾞ', 'ヂ': 'ﾁﾞ', 'ヅ': 'ﾂﾞ', 'デ': 'ﾃﾞ', 'ド': 'ﾄﾞ', 'バ': 'ﾊﾞ', 'ビ': 'ﾋﾞ', 'ブ': 'ﾌﾞ', 'ベ': 'ﾍﾞ', 'ボ': 'ﾎﾞ', 'パ': 'ﾊﾟ', 'ピ': 'ﾋﾟ', 'プ': 'ﾌﾟ', 'ペ': 'ﾍﾟ', 'ポ': 'ﾎﾟ', 'ヴ': 'ｳﾞ', 'ァ': 'ｧ', 'ィ': 'ｨ', 'ゥ': 'ｩ', 'ェ': 'ｪ', 'ォ': 'ｫ', 'ッ': 'ｯ', 'ャ': 'ｬ', 'ュ': 'ｭ', 'ョ': 'ｮ', 'ア': 'ｱ', 'イ': 'ｲ', 'ウ': 'ｳ', 'エ': 'ｴ', 'オ': 'ｵ', 'カ': 'ｶ', 'キ': 'ｷ', 'ク': 'ｸ', 'ケ': 'ｹ', 'コ': 'ｺ', 'サ': 'ｻ', 'シ': 'ｼ', 'ス': 'ｽ', 'セ': 'ｾ', 'ソ': 'ｿ', 'タ': 'ﾀ', 'チ': 'ﾁ', 'ツ': 'ﾂ', 'テ': 'ﾃ', 'ト': 'ﾄ', 'ナ': 'ﾅ', 'ニ': 'ﾆ', 'ヌ': 'ﾇ', 'ネ': 'ﾈ', 'ノ': 'ﾉ', 'ハ': 'ﾊ', 'ヒ': 'ﾋ', 'フ': 'ﾌ', 'ヘ': 'ﾍ', 'ホ': 'ﾎ', 'マ': 'ﾏ', 'ミ': 'ﾐ', 'ム': 'ﾑ', 'メ': 'ﾒ', 'モ': 'ﾓ', 'ヤ': 'ﾔ', 'ユ': 'ﾕ', 'ヨ': 'ﾖ', 'ラ': 'ﾗ', 'リ': 'ﾘ', 'ル': 'ﾙ', 'レ': 'ﾚ', 'ロ': 'ﾛ', 'ワ': 'ﾜ', 'ヲ': 'ｦ', 'ン': 'ﾝ', 'ー': 'ｰ'
            };
            return katakana.replace(/[ァ-ンヴー]/g, s => map[s] || s);
        }
    },

    Network: {
        config: { ip: "192.168.1.20", port: "8080" },
        sendReservation: function (requestNumber) {
            return new Promise((resolve) => {
                const cleanNum = requestNumber.replace(/-/g, '');
                const url = `http://${this.config.ip}:${this.config.port}/reserve?number=${cleanNum}`;
                console.log(`送信先: ${url}`);
                setTimeout(() => { resolve(`予約完了: ${cleanNum}`); }, 500);
            });
        }
    },

    UI: {
        showLoading: (msg) => {
            const m = document.getElementById('loading-modal');
            const t = document.getElementById('loading-message');
            if (t) t.textContent = msg;
            if (m) m.show();
        },
        hideLoading: () => {
            const m = document.getElementById('loading-modal');
            if (m) m.hide();
        },
        handleError: (msg) => {
            App.UI.hideLoading();
            ons.notification.alert(msg);
        },
        updateFooterInfo: () => {
            const el = document.getElementById('app-info-display');
            if (el) el.innerHTML = `楽曲数: ${App.Data.songs.length} 件 / 更新: ${App.Data.lastUpdateDate}`;
        },

        setupPage: function (page) {
            if (!page || page.isInitialized) return;
            const pid = page.id;

            if (pid === 'top-page') this.setupTopPage(page);
            else if (pid === 'keyboard-page') setupKeyboardPage(page);
            else if (pid === 'results-page') setupResultsPage(page);
            else if (pid === 'details-page') setupDetailsPage(page);
            else if (pid === 'list-select-page') setupListSelectPage(page);
            else if (pid === 'settings-page') this.setupSettingsPage(page);
            else if (pid === 'releasenote-page') this.setupReleaseNotePage(page);
            else if (pid === 'newsongs-page') setupNewSongsPage(page);

            // 「TOPへ」ボタンの共通処理
            const topBtn = page.querySelector('.btn-goto-top');
            if (topBtn) {
                topBtn.onclick = () => {
                    App.navigator.resetToPage('top.html');
                };
            }

            page.isInitialized = true;
        },

        setupTopPage: function (page) {
            page.querySelectorAll('.search-card').forEach(card => {
                card.onclick = () => App.navigator.pushPage('keyboard.html', { data: { searchType: card.dataset.searchType } });
            });
            page.querySelectorAll('.sub-card[data-list-type]').forEach(card => {
                card.onclick = () => {
                    const type = card.dataset.listType;
                    if (type === 'release_year') {
                        App.navigator.pushPage('keyboard.html', { data: { searchType: 'release_year' } });
                    } else {
                        App.navigator.pushPage('list_select.html', { data: { listType: type } });
                    }
                };
            });
            const btnHistory = page.querySelector('#btn-history');
            if (btnHistory) btnHistory.onclick = () => App.navigator.pushPage('list_select.html', { data: { listType: 'history' } });

            const btnFavorite = page.querySelector('#btn-favorite');
            if (btnFavorite) btnFavorite.onclick = () => App.navigator.pushPage('list_select.html', { data: { listType: 'csSelect' } });

            const btnLatest = page.querySelector('#btn-latest');
            if (btnLatest) btnLatest.onclick = () => App.navigator.pushPage('newsongs.html');

            const btnGenreNew = page.querySelector('#btn-genre-new');
            if (btnGenreNew) btnGenreNew.onclick = () => App.navigator.pushPage('list_select.html', { data: { listType: 'genre' } });

            const btnFavoriteNew = page.querySelector('#btn-favorite-new');
            if (btnFavoriteNew) btnFavoriteNew.onclick = () => App.navigator.pushPage('list_select.html', { data: { listType: 'new_favorite' } });

            const btnBanner01 = page.querySelector('#btn-banner01');
            if (btnBanner01) btnBanner01.onclick = () => App.navigator.pushPage('list_select.html', { data: { listType: 'banner01' } });

            const btnBanner02 = page.querySelector('#btn-banner02');
            if (btnBanner02) btnBanner02.onclick = () => App.navigator.pushPage('list_select.html', { data: { listType: 'banner02' } });

            const btnBanner03 = page.querySelector('#btn-banner03');
            if (btnBanner03) btnBanner03.onclick = () => App.navigator.pushPage('list_select.html', { data: { listType: 'banner03' } });

            const btnSettings = page.querySelector('#btn-settings');
            if (btnSettings) btnSettings.onclick = () => App.navigator.pushPage('settings.html');

            const btnUpdate = page.querySelector('#db-update-button');
            if (btnUpdate) {
                btnUpdate.onclick = () => {
                    ons.notification.confirm({
                        message: 'DBを再読み込みしますか？',
                        callback: (i) => { if (i === 1) { App.Data.isInitialized = false; App.Data.init(); } }
                    });
                };
            }

            const numBtn = page.querySelector('#btn-number-search');
            if (numBtn) numBtn.onclick = () => App.navigator.pushPage('keyboard.html', { data: { searchType: 'number' } });

            if (App.Data.isInitialized) this.updateFooterInfo();
        },

        setupSettingsPage: function (page) {
            const sw = page.querySelector('#switch-tablet-mode');
            const swLite = page.querySelector('#switch-lite-mode');

            sw.checked = App.Settings.data.isTabletMode;
            if (swLite) swLite.checked = App.Settings.data.isLiteMode;

            sw.onchange = function() {
                App.Settings.data.isTabletMode = sw.checked;
                App.Settings.save();
                App.Settings.apply();
                ons.notification.toast(`タブレットモードを${sw.checked ? 'ON' : 'OFF'}にしました`, { timeout: 1000 });
            };

            if (swLite) {
                swLite.onchange = function() {
                    App.Settings.data.isLiteMode = swLite.checked;
                    App.Settings.save();
                    ons.notification.toast(`Liteモードを${swLite.checked ? 'ON' : 'OFF'}にしました`, { timeout: 1000 });
                };
            }

            const btnNetwork = page.querySelector('#btn-network-settings');
            if (btnNetwork) {
                btnNetwork.onclick = () => App.navigator.pushPage('network_settings.html');
            }

            const btnReleaseNote = page.querySelector('#btn-release-note');
            if (btnReleaseNote) {
                btnReleaseNote.onclick = () => App.navigator.pushPage('releasenote.html');

                const versionDisplay = page.querySelector('#version-display');
                if (versionDisplay) {
                    fetch('csv/releasenote.json?t=' + new Date().getTime())
                        .then(res => res.json())
                        .then(data => {
                            if (data && data.length > 0) {
                                versionDisplay.textContent = data[0].version;
                            }
                        })
                        .catch(err => console.warn('releasenote version fetch error:', err));
                }
            }

            if (App.Data.isInitialized) App.UI.updateFooterInfo();

            const btnForceUpdate = page.querySelector('#btn-force-update');
            if (btnForceUpdate) {
                btnForceUpdate.onclick = () => {
                    ons.notification.alert('この機能は未実装です(CSVフォルダとIMGフォルダのデータをコマンダーから全件強制受信上書き機能');
                };
            }

            const btnErrorLog = page.querySelector('#btn-error-log');
            if (btnErrorLog) {
                btnErrorLog.onclick = () => App.navigator.pushPage('list_select.html', { data: { listType: 'errorlog' } });
            }

            const btnClearHistory = page.querySelector('#btn-clear-history');
            if (btnClearHistory) {
                btnClearHistory.onclick = () => {
                    ons.notification.confirm({
                        message: '予約履歴をすべて削除しますか？',
                        callback: (idx) => {
                            if (idx === 1) {
                                App.History.clear();
                                ons.notification.toast('予約履歴をクリアしました', { timeout: 1500 });
                            }
                        }
                    });
                };
            }

            const btnClearNewFav = page.querySelector('#btn-clear-new-favorites');
            if (btnClearNewFav) {
                btnClearNewFav.onclick = () => {
                    ons.notification.confirm({
                        message: 'お気に入りリストをすべて消去しますか？',
                        callback: (idx) => {
                            if (idx === 1) {
                                App.NewFavorites.clear();
                                ons.notification.toast('お気に入りリストを初期化しました', { timeout: 1500 });
                            }
                        }
                    });
                };
            }

            const btnUploadLogs = page.querySelector('#btn-upload-logs');
            if (btnUploadLogs) {
                btnUploadLogs.onclick = () => {
                    ons.notification.alert('この機能は未実装です(履歴ログ、エラー楽曲ログ、お気に入りリストログをセンターに送信します)');
                };
            }
        },

        setupNetworkSettingsPage: function (page) {
            const ip = page.querySelector('#input-server-ip');
            const port = page.querySelector('#input-server-port');
            const btnSave = page.querySelector('#btn-save-network');
            const btnTest = page.querySelector('#btn-test-network');

            ip.value = App.Settings.data.serverIp;
            port.value = App.Settings.data.serverPort;

            btnSave.onclick = () => {
                App.Settings.data.serverIp = ip.value;
                App.Settings.data.serverPort = port.value;
                App.Settings.save();
                ons.notification.toast('通信設定を保存しました', { timeout: 1000 });
            };

            btnTest.onclick = () => {
                App.Network.sendReservation('0000-00')
                    .then(msg => ons.notification.alert(msg))
                    .catch(err => ons.notification.alert('送信エラー: ' + err));
            };
        },

        setupReleaseNotePage: function (page) {
            const listContainer = page.querySelector('#releasenote-list');
            fetch('csv/releasenote.json?t=' + new Date().getTime())
                .then(res => res.json())
                .then(data => {
                    listContainer.innerHTML = '';
                    data.forEach(note => {
                        const item = document.createElement('div');
                        item.style.marginBottom = '24px';
                        item.innerHTML = `
                            <div style="font-weight:bold; font-size:16px; margin-bottom:8px;">${note.version}　　${note.date}</div>
                            <div style="font-size:14px; white-space:pre-wrap; line-height:1.5; color:#333;">${note.content}</div>
                            <hr style="border:none; border-bottom:1px solid #ddd; margin-top:16px;">
                        `;
                        listContainer.appendChild(item);
                    });
                })
                .catch(err => {
                    listContainer.innerHTML = '<div style="color:red; text-align:center;">リリースノートの読み込みに失敗しました。</div>';
                    console.error('releasenote fetch error:', err);
                });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.Settings.load();
    App.History.load(); // 履歴の読み込みを追加
    App.ErrorLog.load(); // エラーログの読み込み
    App.NewFavorites.load(); // 新お気に入りの読み込み
    App.navigator = document.getElementById('myNavigator');
    App.navigator.addEventListener('postpush', (e) => App.UI.setupPage(e.enterPage));
});
ons.ready(() => {
    if (App.navigator && App.navigator.pages.length > 0) App.UI.setupPage(App.navigator.pages[0]);
});
document.addEventListener('deviceready', () => {
    App.Settings.load();
    App.Data.init();
}, false);


/* --- 各ページロジック --- */

function setupKeyboardPage(page) {
    const type = page.data.searchType || 'song_title';
    const isTablet = App.Settings.data.isTabletMode;

    const display = page.querySelector('#input-display');
    const nativeInput = page.querySelector('#native-input');
    const hitCount = page.querySelector('#hit-count');
    const keyboardGrid = page.querySelector('.keyboard-grid-container');
    const keyboardBody = page.querySelector('.keyboard-body');
    const sideControls = page.querySelector('.keyboard-side-controls');

    const kanaKb = page.querySelector('#kana-keyboard');
    const engKb = page.querySelector('#eng-keyboard');
    const numKb = page.querySelector('#number-keyboard');

    const titles = {
        'song_title': '曲名検索',
        'artist': '歌手検索',
        'keyword': 'キーワード検索',
        'number': '番号入力',
        'release_year': '発売年から探す'
    };
    page.querySelector('#keyboard-page-title').textContent = titles[type] || '検索';

    let currentQuery = "";
    let mode = 'kana';

    const updateHits = () => {
        if (currentQuery.length === 0) {
            hitCount.textContent = "";
            return;
        }
        const currentMode = page.querySelector('#side-kana-button').classList.contains('active') ? 'kana' : 'eng';
        const results = App.Data.search(currentQuery, type, currentMode);
        hitCount.textContent = results.length > 0 ? `${results.length}件` : "";
    };

    const updateDisplay = () => {
        display.textContent = currentQuery;
        updateHits();
    };

    // モード別の表示切替
    if (isTablet) {
        display.style.display = 'block';
        nativeInput.style.display = 'none';
        keyboardBody.style.display = 'block';
        sideControls.style.display = 'grid';
        page.querySelector('#smartphone-actions').style.display = 'none';
        keyboardGrid.style.gridTemplateColumns = '1fr 100px';
    } else {
        display.style.display = 'none';
        nativeInput.style.display = 'inline-block';
        keyboardBody.style.display = 'none';
        sideControls.style.display = 'none'; // サイドを隠す
        page.querySelector('#smartphone-actions').style.display = 'flex'; // 下部ボタンを出す
        keyboardGrid.style.gridTemplateColumns = '1fr'; // 全幅

        if (type === 'number') {
            display.style.display = 'block';
            nativeInput.style.display = 'none';
            keyboardBody.style.display = 'block';
            sideControls.style.display = 'grid'; // 番号入力は利便性のためサイドを出す
            page.querySelector('#smartphone-actions').style.display = 'none';
            keyboardGrid.style.gridTemplateColumns = '1fr 100px';
        }
        nativeInput.oninput = (e) => {
            currentQuery = e.target.value;
            updateHits();
        };
        setTimeout(() => { if (type !== 'number') nativeInput.focus(); }, 300);
    }

    const applyDakuten = (str, char) => {
        if (!str) return str;
        const last = str.slice(-1);
        const map = (char === '゛') ? dakuon : handakuon;
        if (map[last]) return str.slice(0, -1) + map[last];
        return str;
    };

    const dakuon = { 'か': 'が', 'き': 'ぎ', 'く': 'ぐ', 'け': 'げ', 'こ': 'ご', 'さ': 'ざ', 'し': 'じ', 'す': 'ず', 'せ': 'ぜ', 'そ': 'ぞ', 'た': 'だ', 'ち': 'ぢ', 'つ': 'づ', 'て': 'で', 'と': 'ど', 'は': 'ば', 'ひ': 'び', 'ふ': 'ぶ', 'へ': 'べ', 'ほ': 'ぼ' };
    const handakuon = { 'は': 'ぱ', 'ひ': 'ぴ', 'ふ': 'ぷ', 'へ': 'ぺ', 'ほ': 'ぽ' };

    if (type === 'number' || type === 'release_year') {
        hitCount.style.display = 'none';
        kanaKb.classList.remove('active');
        numKb.classList.add('active');
        page.querySelector('#side-kana-button').style.visibility = 'hidden';
        page.querySelector('#side-eng-button').style.visibility = 'hidden';

        numKb.querySelectorAll('.key').forEach(k => {
            k.onclick = () => {
                const char = k.textContent.trim();
                const limit = (type === 'release_year') ? 4 : 6;

                if (currentQuery.length < limit) {
                    currentQuery += char;
                    if (type === 'release_year') {
                        display.textContent = currentQuery;
                    } else {
                        display.textContent = currentQuery.slice(0, 4) + (currentQuery.length > 4 ? '-' : '') + currentQuery.slice(4);
                    }
                }
            };
        });
    } else {
        page.querySelectorAll('.keyboard .key').forEach(btn => {
            btn.onclick = () => {
                const char = btn.textContent.trim();
                if (char === "゛" || char === "゜") {
                    currentQuery = applyDakuten(currentQuery, char);
                } else {
                    currentQuery += char;
                }
                updateDisplay();
            };
        });
    }

    // 共通操作
    const executeSearch = () => {
        if (!currentQuery) return;

        let queryToSearch = currentQuery;

        // 発売年の場合は4桁チェック
        if (type === 'release_year') {
            if (currentQuery.length !== 4) {
                ons.notification.alert('発売年は4桁の数字で入力してください。');
                return;
            }
        }

        // 選曲番号の場合はハイフンを挿入
        if (type === 'number') {
            if (currentQuery.length === 6) {
                queryToSearch = currentQuery.slice(0, 4) + '-' + currentQuery.slice(4);
            }
        }

        const currentMode = page.querySelector('#side-kana-button').classList.contains('active') ? 'kana' : 'eng';
        const results = App.Data.search(queryToSearch, type, currentMode);

        // 選曲番号の場合は特殊な挙動
        if (type === 'number') {
            if (results.length > 0) {
                // 該当あり：直接詳細画面へ
                App.History.add(results[0]); // 履歴に追加
                App.navigator.pushPage('details.html', { data: { songId: results[0].request_number } });
            } else {
                // Liteモード起因かどうかをチェック
                const realSong = App.Data.songs.find(s => s.request_number === queryToSearch);
                if (App.Settings.data.isLiteMode && realSong && realSong.lite === "1") {
                    ons.notification.alert('指定曲は選曲できません');
                    return;
                }

                // 該当なし：確認ダイアログ
                ons.notification.confirm({
                    title: '確認',
                    message: '入力した番号の曲は存在しません。',
                    buttonLabels: ['戻る', 'そのまま送信'],
                    callback: (index) => {
                        if (index === 1) {
                            // そのまま送信
                            const rawSong = { request_number: queryToSearch, title: "直接入力", artist: "", type_code: "99" };
                            App.History.add(rawSong); // 履歴に追加
                            App.Network.sendReservation(queryToSearch)
                                .then(msg => ons.notification.toast(msg, { timeout: 2000 }));
                        }
                    }
                });
            }
            return;
        }

        App.navigator.pushPage('results.html', {
            data: { searchResults: results, searchQuery: queryToSearch, searchTypeLabel: titles[type] }
        });
    };

    page.querySelector('#side-execute-search-button').onclick = executeSearch;
    page.querySelector('#sp-execute-button').onclick = executeSearch;

    const clearAll = () => {
        currentQuery = "";
        if (type === 'number') {
            display.textContent = "";
        } else {
            updateDisplay();
            if (!isTablet) nativeInput.value = "";
        }
    };

    page.querySelector('#side-clear-all-button').onclick = clearAll;
    page.querySelector('#sp-clear-button').onclick = clearAll;

    page.querySelector('#side-delete-char-button').onclick = () => {
        currentQuery = currentQuery.slice(0, -1);
        if (type === 'number') {
            display.textContent = currentQuery.slice(0, 4) + (currentQuery.length > 4 ? '-' : '') + currentQuery.slice(4);
        } else if (type === 'release_year') {
            display.textContent = currentQuery;
        } else {
            updateDisplay();
            if (!isTablet) nativeInput.value = currentQuery;
        }
    };

    const btnKana = page.querySelector('#side-kana-button');
    const btnEng = page.querySelector('#side-eng-button');

    btnKana.onclick = () => {
        mode = 'kana';
        engKb.classList.remove('active');
        kanaKb.classList.add('active');
        btnEng.classList.remove('active');
        btnKana.classList.add('active');
        updateHits();
    };

    btnEng.onclick = () => {
        mode = 'eng';
        kanaKb.classList.remove('active');
        engKb.classList.add('active');
        btnKana.classList.remove('active');
        btnEng.classList.add('active');
        updateHits();
    };

}

// 検索結果画面 (ページネーション実装)
function setupResultsPage(page) {
    // 状態管理用変数
    const originalResults = page.data.searchResults || [];
    let results = originalResults;
    let list = page.querySelector('.results-list') || page.querySelector('#results-list');
    const titleEl = page.querySelector('#results-page-title') || page.querySelector('.center');

    // 実機でのタイミング問題を回避するため、見つからない場合は少し待って再試行
    if (!list) {
        setTimeout(() => {
            // クラス名での取得を優先し、さらにドキュメント全体からの取得も試行する
            list = page.querySelector('.results-list') || page.querySelector('#results-list');
            if (!list) {
                const allLists = document.querySelectorAll('.results-list');
                if (allLists.length > 0) {
                    list = allLists[allLists.length - 1]; // 一番最後に追加された（アクティブな）リストを採用
                }
            }

            if (!list) {
                console.error('results-list not found even after robust retry. Page ID:', page.id);
                // 最終手段：動的に作ってしまう
                list = document.createElement('ons-list');
                list.className = 'results-list';
                const container = page.querySelector('.results-container') || page.querySelector('.page__content') || page;
                container.appendChild(list);
            }
            initResults();
        }, 100);
        return;
    }

    initResults();

    function initResults() {
        if (titleEl) {
            titleEl.textContent = `${page.data.searchQuery} の結果`;
        }

        let renderedCount = 0;
        const CHUNK_SIZE = 100; // 1回に読み込む件数

        // チャンク描画関数
        const renderChunk = () => {
            // 現在の末尾にある「さらに読み込む」ボタンを削除
            const oldBtn = list.querySelector('.load-more-item');
            if (oldBtn) oldBtn.remove();

            // 今回描画する範囲
            const nextCount = Math.min(results.length, renderedCount + CHUNK_SIZE);
            const fragment = document.createDocumentFragment();

            for (let i = renderedCount; i < nextCount; i++) {
                const res = results[i];

                if (typeof res === 'string') {
                    // 【歌手一覧モード】
                    const item = ons.createElement(`
                        <ons-list-item tappable>
                            <div class="center">
                                <span style="font-weight:bold; font-size:16px;">${res}</span>
                            </div>
                        </ons-list-item>
                    `);
                    item.onclick = () => {
                        let songs = App.Data.songs.filter(s => s.artist === res);
                        // もしジャンルフィルタ（本人映像など）が渡されていれば絞り込み
                        if (page.data.genreFilter && page.data.genreFilter.filterCodes) {
                            songs = songs.filter(s => page.data.genreFilter.filterCodes.includes(s.type_code));
                        }
                        if (App.Settings.data.isLiteMode) songs = songs.filter(s => s.lite !== "1");
                        
                        // 選択された歌手の楽曲も同様にソート
                        songs.sort((a, b) => {
                            const kanaA = a.title_kana || '';
                            const kanaB = b.title_kana || '';
                            if (kanaA !== kanaB) return kanaA.localeCompare(kanaB, 'ja');
                            const pA = App.Data.typePriority[a.type_code] || 99;
                            const pB = App.Data.typePriority[b.type_code] || 99;
                            if (pA !== pB) return pA - pB;
                            return a.request_number.localeCompare(b.request_number);
                        });
                        App.navigator.pushPage('results.html', {
                            data: { searchResults: songs, searchQuery: res, searchTypeLabel: '楽曲一覧' }
                        });
                    };
                    fragment.appendChild(item);
                } else {
                    // 【通常楽曲モード】
                    const s = res;
                    const squareTypeCode = s.type_code ? String(s.type_code).padStart(3, '0') : '';
                    const typeImg = squareTypeCode
                        ? `<img src="img/songtype/${squareTypeCode}.png" onerror="this.style.display='none'">`
                        : '';
                    const machImg = s.model_code
                        ? `<img src="img/machinetype/${s.model_code}.png" onerror="this.style.display='none'">`
                        : '';

                    const item = ons.createElement(`
                        <ons-list-item tappable class="search-result-item">
                            <div class="list-item-container">
                                <div class="list-item-song-type">${typeImg}</div>
                                <div class="list-item-main-content">
                                    <div class="list-item-title-row">
                                        <div class="list-item-title">${s.title}</div>
                                        <div class="list-item-machine-type">${machImg}</div>
                                    </div>
                                    ${s.subtitle ? `<div class="list-item-subtitle">${s.subtitle}</div>` : ''}
                                    <div class="list-item-artist">${s.artist}</div>
                                </div>
                            </div>
                        </ons-list-item>
                    `);
                    item.onclick = () => App.navigator.pushPage('details.html', { data: { songId: s.request_number } });
                    fragment.appendChild(item);
                }
            }

            list.appendChild(fragment);
            renderedCount = nextCount;

            // まだデータが残っている場合、「さらに読み込む」ボタンを追加
            if (renderedCount < results.length) {
                const remain = results.length - renderedCount;
                const btnItem = ons.createElement(`
                    <ons-list-item class="load-more-item" tappable modifier="chevron" style="background-color:#f0f0f0;">
                        <div class="center" style="justify-content:center; color:#007aff; font-weight:bold;">
                            さらに読み込む (残り${remain}件)
                        </div>
                    </ons-list-item>
                `);
                btnItem.onclick = renderChunk; // 自分自身を呼ぶ
                list.appendChild(btnItem);
            }
        };

        const filterBtn = page.querySelector('#btn-filter-results');
        if (filterBtn) {
            if (originalResults.length > 0 && typeof originalResults[0] === 'string') {
                filterBtn.style.display = 'none';
            } else {
                filterBtn.onclick = () => {
                    ons.openActionSheet({
                        title: '絞り込み',
                        cancelable: true,
                        buttons: [
                            'すべて表示',
                            '本人映像 (SongType 02,03,08,10)',
                            'ｱﾆﾒ映像 (SongType 04)',
                            'MV (SongType 09)',
                            { label: 'キャンセル', icon: 'md-close' }
                        ]
                    }).then((index) => {
                        if (index === 0) {
                            results = originalResults;
                        } else if (index === 1) {
                            const targets = ['02', '03', '08', '10'];
                            results = originalResults.filter(s => targets.includes(s.type_code));
                        } else if (index === 2) {
                            results = originalResults.filter(s => s.type_code === '04');
                        } else if (index === 3) {
                            results = originalResults.filter(s => s.type_code === '09');
                        } else {
                            return;
                        }
                        list.innerHTML = '';
                        renderedCount = 0;
                        if (results.length === 0) {
                            list.innerHTML = '<ons-list-item>該当なし</ons-list-item>';
                        } else {
                            renderChunk();
                        }
                        const content = page.querySelector('.page__content');
                        if (content) content.scrollTop = 0;
                    });
                };
            }
        }

        // 初回描画
        list.innerHTML = '';
        if (results.length === 0) {
            list.innerHTML = '<ons-list-item>該当なし</ons-list-item>';
        } else {
            renderChunk();
        }
    }
}

// 詳細画面
function setupDetailsPage(page) {
    const id = page.data.songId;
    const song = App.Data.songs.find(s => s.request_number == id);
    const container = page.querySelector('#song-details-content');
    const layout = page.querySelector('#details-page-layout');
    const isTablet = App.Settings.data.isTabletMode;

    if (!container) {
        console.error('song-details-content not found on details-page');
        return;
    }

    if (!song) { container.innerHTML = '<p>エラー: 楽曲が見つかりません</p>'; return; }

    // スマホモード時はクラスを付与してスタイルを適用
    if (!isTablet) {
        layout.classList.add('smartphone-mode');
    }

    const txt = (k) => song[k] || '－';
    const typeImgCode = song.type_code ? String(song.type_code).padStart(2, '0') : '';
    const imgType = typeImgCode
        ? `<img src="img/songtype/${typeImgCode}.png" class="details-img-type" onerror="this.parentElement.textContent='画像なし'">`
        : '－';
    const imgMach = song.model_code
        ? `<img src="img/machinetype/${song.model_code}.png" class="details-img-mach" onerror="this.parentElement.textContent='画像なし'">`
        : '－';

    const html = `
        <div class="details-header-visual">
            <div id="jacket-image-container" class="jacket-container"></div>
            <div class="machine-logo-container">${imgMach}</div>
        </div>
        <table class="details-table">
            <tr>
                <th id="th-search-parent" class="clickable-th">曲名</th>
                <td colspan="3">
                    <div class="main-text">${txt('title')}</div>
                    ${song.subtitle ? `<div class="sub-text">${txt('subtitle')}</div>` : ''}
                    <div class="kana-text">${txt('title_kana')}</div>
                </td>
            </tr>
            <tr>
                <th id="th-search-artist" class="clickable-th">歌手名</th>
                <td colspan="3">
                    <div class="main-text">${txt('artist')}</div>
                    <div class="kana-text">${txt('artist_kana')}</div>
                </td>
            </tr>
            <tr>
                <th>歌いだし</th>
                <td colspan="3" class="lyrics-start">${txt('lyrics_start')}</td>
            </tr>
            <tr>
                <th>タイプ</th><td>${imgType}</td>
                <th>キー</th><td>${txt('original_key')}</td>
            </tr>
            <tr>
                <th>発売年</th><td>${txt('release_year')}${song.release_year ? '年' : ''}</td>
                <th>選曲番号</th><td>${txt('request_number')}</td>
            </tr>
            <tr>
                <th>備考1</th><td colspan="3">${txt('remarks1')}</td>
            </tr>
            <tr>
                <th>備考2</th><td colspan="3">${txt('remarks2')}</td>
            </tr>
        </table>
        
        <div class="details-reservation-container" style="display: flex; gap: 10px; justify-content: space-between;">
            <ons-button id="btn-add-new-favorite" style="background-color: #ff3b30; flex: 1; text-align: center;">お気に入り登録</ons-button>
            <ons-button id="reservation-button" style="flex: 1; text-align: center;">予約送信</ons-button>
        </div>
    `;
    container.innerHTML = html;

    // お気に入り登録ボタンの処理
    const btnAddFav = page.querySelector('#btn-add-new-favorite');
    if (btnAddFav) {
        btnAddFav.onclick = () => {
            ons.notification.confirm({
                message: 'お気に入りに登録しますか？',
                callback: function(idx) {
                    if (idx === 1) {
                        App.NewFavorites.add(song);
                        ons.notification.toast('お気に入りに登録しました', { timeout: 1500 });
                    }
                }
            });
        };
    }

    // 予約ボタンの処理
    page.querySelector('#reservation-button').onclick = () => {
        if (App.Settings.data.isLiteMode && song.lite === "1") {
            ons.notification.alert('指定曲は選曲できません');
            return;
        }
        App.History.add(song); // 履歴に追加
        App.Network.sendReservation(song.request_number)
            .then(msg => ons.notification.toast(msg, { timeout: 2000 }));
    };

    // 項目名クリックでのID検索
    page.querySelector('#th-search-parent').onclick = () => {
        const parentId = song.parent_song_id;
        if (!parentId || parentId === 'nan') return ons.notification.toast('関連曲データがありません', { timeout: 1000 });
        const results = App.Data.songs.filter(s => s.parent_song_id === parentId);
        App.navigator.pushPage('results.html', { data: { searchResults: results, searchQuery: `関連曲(${song.title})`, searchTypeLabel: '関連曲' } });
    };

    page.querySelector('#th-search-artist').onclick = () => {
        const artistId = song.artist_id;
        if (!artistId || artistId === 'nan') return ons.notification.toast('歌手データがありません', { timeout: 1000 });
        const results = App.Data.songs.filter(s => s.artist_id === artistId);
        App.navigator.pushPage('results.html', { data: { searchResults: results, searchQuery: song.artist, searchTypeLabel: '歌手曲検索' } });
    };

    // ジャケット画像の読み込み試行
    const jacketContainer = page.querySelector('#jacket-image-container');
    const baseUrl = 'img/ico/'; // ローカルフォルダに変更
    const reqNumRaw = song.request_number || "";
    const reqNumClean = reqNumRaw.replace(/-/g, '');
    const parentId = (song.parent_song_id && song.parent_song_id !== 'nan') ? song.parent_song_id : null;

    const imgElement = document.createElement('img');
    imgElement.className = 'jacket-image';

    imgElement.onerror = () => {
        if (imgElement.src.includes(reqNumClean) && parentId) {
            // 第1候補失敗 -> 第2候補へ
            imgElement.src = baseUrl + parentId + '.png';
        } else {
            jacketContainer.style.display = 'none';
        }
    };

    // 読み込み開始
    imgElement.src = baseUrl + reqNumClean + '.png';
    jacketContainer.appendChild(imgElement);

    // ツールバーの予約ボタンはクリア
    const resContainer = document.getElementById('reservation-button-container');
    if (resContainer) resContainer.innerHTML = '';

    // エラー報告ボタンの処理
    const btnReportError = page.querySelector('#btn-report-error');
    if (btnReportError) {
        btnReportError.onclick = () => {
            let dialog = document.getElementById('error-dialog');
            if (!dialog) {
                dialog = ons.createElement(`
                    <ons-dialog id="error-dialog">
                        <div style="text-align: center; padding: 10px;">
                            <p>エラー内容を選択してください</p>
                            <ons-list>
                                <ons-list-item tappable>
                                    <label class="left">
                                        <ons-radio name="error-reason" input-id="radio-1" value="楽曲が存在しない" checked></ons-radio>
                                    </label>
                                    <label for="radio-1" class="center">楽曲が存在しない</label>
                                </ons-list-item>
                                <ons-list-item tappable>
                                    <label class="left">
                                        <ons-radio name="error-reason" input-id="radio-2" value="楽曲情報に不備がある"></ons-radio>
                                    </label>
                                    <label for="radio-2" class="center">楽曲情報に不備がある</label>
                                </ons-list-item>
                                <ons-list-item tappable>
                                    <label class="left">
                                        <ons-radio name="error-reason" input-id="radio-3" value="楽曲が重複している"></ons-radio>
                                    </label>
                                    <label for="radio-3" class="center">楽曲が重複している</label>
                                </ons-list-item>
                                <ons-list-item tappable>
                                    <label class="left">
                                        <ons-radio name="error-reason" input-id="radio-4" value="楽曲タイプが間違っている"></ons-radio>
                                    </label>
                                    <label for="radio-4" class="center">楽曲タイプが間違っている</label>
                                </ons-list-item>
                                <ons-list-item tappable>
                                    <label class="left">
                                        <ons-radio name="error-reason" input-id="radio-5" value="選曲番号が間違っている"></ons-radio>
                                    </label>
                                    <label for="radio-5" class="center">選曲番号が間違っている</label>
                                </ons-list-item>
                                <ons-list-item tappable>
                                    <label class="left">
                                        <ons-radio name="error-reason" input-id="radio-6" value="機種が間違っている"></ons-radio>
                                    </label>
                                    <label for="radio-6" class="center">機種が間違っている</label>
                                </ons-list-item>
                                <ons-list-item tappable>
                                    <label class="left">
                                        <ons-radio name="error-reason" input-id="radio-7" value="動画データに不具合がある"></ons-radio>
                                    </label>
                                    <label for="radio-7" class="center">動画データに不具合がある</label>
                                </ons-list-item>
                            </ons-list>
                            <div style="margin-top: 15px; display: flex; justify-content: space-around;">
                                <ons-button id="btn-cancel-error" modifier="quiet">キャンセル</ons-button>
                                <ons-button id="btn-save-error">保存</ons-button>
                            </div>
                        </div>
                    </ons-dialog>
                `);
                document.body.appendChild(dialog);
            }

            dialog.querySelector('#btn-cancel-error').onclick = () => {
                dialog.hide().then(() => dialog.remove());
            };

            dialog.querySelector('#btn-save-error').onclick = () => {
                const radios = Array.from(dialog.querySelectorAll('ons-radio[name="error-reason"]'));
                const selected = radios.find(r => r.checked);
                if (selected) {
                    App.ErrorLog.add(song, selected.value);
                    ons.notification.toast('エラー内容を保存しました', { timeout: 1500 });
                }
                dialog.hide().then(() => dialog.remove());
            };

            dialog.show();
        };
    }
}

// リスト選択画面
function setupListSelectPage(page) {
    const type = page.data.listType;
    const list = page.querySelector('#select-list');
    const title = page.querySelector('#list-select-page-title');

    list.innerHTML = '';

    if (type === 'history') {
        title.textContent = '履歴';


        const historyData = App.History.data;
        if (historyData.length === 0) {
            list.innerHTML = '<ons-list-item>履歴はありません</ons-list-item>';
        } else {
            historyData.forEach(savedSong => {
                // 最新のDBデータと照合して機種コード等を補完（なければ保存されたデータを使用）
                const dbSong = App.Data.songs.find(s => s.request_number === savedSong.request_number);
                const song = dbSong || savedSong;

                // DBにない場合は 099 を使用
                const rawTypeCode = dbSong ? song.type_code : "99";
                const squareTypeCode = String(rawTypeCode).padStart(3, '0');
                const typeImg = squareTypeCode
                    ? `<img src="img/songtype/${squareTypeCode}.png" onerror="this.style.display='none'">`
                    : '';
                const machImg = song.model_code
                    ? `<img src="img/machinetype/${song.model_code}.png" onerror="this.style.display='none'">`
                    : `<span style="font-size:10px; color:#888;">${song.request_number}</span>`;

                const item = ons.createElement(`
                    <ons-list-item tappable class="search-result-item">
                        <div class="list-item-container">
                            <div class="list-item-song-type">${typeImg}</div>
                            <div class="list-item-main-content">
                                <div class="list-item-title-row">
                                    <div class="list-item-title">${song.title}</div>
                                    <div class="list-item-machine-type">${machImg}</div>
                                </div>
                                ${song.subtitle ? `<div class="list-item-subtitle">${song.subtitle}</div>` : ''}
                                <div class="list-item-artist">${song.artist}</div>
                            </div>
                        </div>
                    </ons-list-item>
                `);
                item.onclick = () => {
                    // 直接詳細へ
                    App.navigator.pushPage('details.html', { data: { songId: song.request_number } });
                };
                list.appendChild(item);
            });
        }
    } else if (type === 'errorlog') {
        title.textContent = 'エラー曲ログ';

        const errorData = App.ErrorLog.data;
        const btnToggle = page.querySelector('#btn-toggle-delete-mode');
        const btnExecute = page.querySelector('#btn-execute-delete');
        const btnCancel = page.querySelector('#btn-cancel-delete');
        const btnGotoTop = page.querySelector('#btn-goto-top-select');

        let isDeleteMode = false;

        const updateToolbar = () => {
            if (App.ErrorLog.data.length === 0) {
                if (btnToggle) btnToggle.style.display = 'none';
                if (btnExecute) btnExecute.style.display = 'none';
                if (btnCancel) btnCancel.style.display = 'none';
                if (btnGotoTop) btnGotoTop.style.display = '';
            } else {
                if (btnToggle) btnToggle.style.display = isDeleteMode ? 'none' : '';
                if (btnExecute) btnExecute.style.display = isDeleteMode ? '' : 'none';
                if (btnCancel) btnCancel.style.display = isDeleteMode ? '' : 'none';
                if (btnGotoTop) btnGotoTop.style.display = isDeleteMode ? 'none' : '';
            }
        };

        if (errorData.length === 0) {
            list.innerHTML = '<ons-list-item>エラーログはありません</ons-list-item>';
            updateToolbar();
        } else {
            errorData.forEach(savedSong => {
                const dbSong = App.Data.songs.find(s => s.request_number === savedSong.request_number);
                const song = dbSong || savedSong;

                const rawTypeCode = dbSong ? song.type_code : "99";
                const squareTypeCode = String(rawTypeCode).padStart(3, '0');
                const typeImg = squareTypeCode
                    ? `<img src="img/songtype/${squareTypeCode}.png" onerror="this.style.display='none'">`
                    : '';
                const machImg = song.model_code
                    ? `<img src="img/machinetype/${song.model_code}.png" onerror="this.style.display='none'">`
                    : `<span style="font-size:10px; color:#888;">${song.request_number}</span>`;

                const item = ons.createElement(`
                    <ons-list-item tappable class="search-result-item" data-timestamp="${savedSong.timestamp}">
                        <div class="left errorlog-checkbox-container" style="display: none; margin-right: 15px;">
                            <ons-checkbox class="errorlog-checkbox" value="${savedSong.timestamp}"></ons-checkbox>
                        </div>
                        <div class="center list-item-container" style="width: 100%;">
                            <div class="list-item-song-type">${typeImg}</div>
                            <div class="list-item-main-content">
                                <div class="list-item-title-row">
                                    <div class="list-item-title">${song.title}</div>
                                    <div class="list-item-machine-type">${machImg}</div>
                                </div>
                                ${song.subtitle ? `<div class="list-item-subtitle">${song.subtitle}</div>` : ''}
                                <div class="list-item-artist" style="display:flex; justify-content:space-between; width:100%;">
                                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${song.artist}</span>
                                    <span style="color: #ff3b30; font-size: 10px; border: 1px solid #ff3b30; padding: 0 4px; border-radius: 4px; white-space: nowrap; align-self: center; margin-left: 8px;">${savedSong.reason}</span>
                                </div>
                            </div>
                        </div>
                    </ons-list-item>
                `);

                item.onclick = (e) => {
                    if (isDeleteMode) {
                        if (e.target.tagName.toLowerCase() !== 'ons-checkbox' && e.target.tagName.toLowerCase() !== 'input') {
                            const checkbox = item.querySelector('ons-checkbox');
                            if (checkbox) checkbox.checked = !checkbox.checked;
                        }
                    } else {
                        App.navigator.pushPage('details.html', { data: { songId: song.request_number } });
                    }
                };
                list.appendChild(item);
            });
            updateToolbar();

            if (btnToggle) {
                btnToggle.onclick = () => {
                    isDeleteMode = true;
                    updateToolbar();
                    list.querySelectorAll('.errorlog-checkbox-container').forEach(el => el.style.display = '');
                };
            }

            if (btnCancel) {
                btnCancel.onclick = () => {
                    isDeleteMode = false;
                    updateToolbar();
                    list.querySelectorAll('.errorlog-checkbox-container').forEach(el => {
                        el.style.display = 'none';
                        const cb = el.querySelector('ons-checkbox');
                        if (cb) cb.checked = false;
                    });
                };
            }

            if (btnExecute) {
                btnExecute.onclick = () => {
                    const checkboxes = Array.from(list.querySelectorAll('.errorlog-checkbox'));
                    const selectedTimestamps = checkboxes.filter(cb => cb.checked).map(cb => parseInt(cb.value, 10));

                    if (selectedTimestamps.length === 0) {
                        ons.notification.alert('削除するログを選択してください');
                        return;
                    }

                    ons.notification.confirm({
                        message: '選択したログを削除しますか？',
                        callback: (idx) => {
                            if (idx === 1) {
                                App.ErrorLog.data = App.ErrorLog.data.filter(log => !selectedTimestamps.includes(log.timestamp));
                                App.ErrorLog.save();
                                ons.notification.toast('削除しました', { timeout: 1500 });
                                setupListSelectPage(page);
                            }
                        }
                    });
                };
            }
        }
    } else if (type === 'new_favorite') {
        title.textContent = 'お気に入り';

        const favData = App.NewFavorites.data;
        const btnToggle = page.querySelector('#btn-toggle-delete-mode');
        const btnExecute = page.querySelector('#btn-execute-delete');
        const btnCancel = page.querySelector('#btn-cancel-delete');
        const btnGotoTop = page.querySelector('#btn-goto-top-select');

        let isDeleteMode = false;

        const updateToolbar = () => {
            if (App.NewFavorites.data.length === 0) {
                if (btnToggle) btnToggle.style.display = 'none';
                if (btnExecute) btnExecute.style.display = 'none';
                if (btnCancel) btnCancel.style.display = 'none';
                if (btnGotoTop) btnGotoTop.style.display = '';
            } else {
                if (btnToggle) btnToggle.style.display = isDeleteMode ? 'none' : '';
                if (btnExecute) btnExecute.style.display = isDeleteMode ? '' : 'none';
                if (btnCancel) btnCancel.style.display = isDeleteMode ? '' : 'none';
                if (btnGotoTop) btnGotoTop.style.display = isDeleteMode ? 'none' : '';
            }
        };

        if (favData.length === 0) {
            list.innerHTML = '<ons-list-item>お気に入り登録はありません</ons-list-item>';
            updateToolbar();
        } else {
            favData.forEach(savedSong => {
                const dbSong = App.Data.songs.find(s => s.request_number === savedSong.request_number);
                const song = dbSong || savedSong;

                const rawTypeCode = dbSong ? song.type_code : "99";
                const squareTypeCode = String(rawTypeCode).padStart(3, '0');
                const typeImg = squareTypeCode
                    ? `<img src="img/songtype/${squareTypeCode}.png" onerror="this.style.display='none'">`
                    : '';
                const machImg = song.model_code
                    ? `<img src="img/machinetype/${song.model_code}.png" onerror="this.style.display='none'">`
                    : `<span style="font-size:10px; color:#888;">${song.request_number}</span>`;

                const item = ons.createElement(`
                    <ons-list-item tappable class="search-result-item" data-timestamp="${savedSong.timestamp}">
                        <div class="left newfav-checkbox-container" style="display: none; margin-right: 15px;">
                            <ons-checkbox class="newfav-checkbox" value="${savedSong.timestamp}"></ons-checkbox>
                        </div>
                        <div class="center list-item-container" style="width: 100%;">
                            <div class="list-item-song-type">${typeImg}</div>
                            <div class="list-item-main-content">
                                <div class="list-item-title-row">
                                    <div class="list-item-title">${song.title}</div>
                                    <div class="list-item-machine-type">${machImg}</div>
                                </div>
                                ${song.subtitle ? `<div class="list-item-subtitle">${song.subtitle}</div>` : ''}
                                <div class="list-item-artist">${song.artist}</div>
                            </div>
                        </div>
                    </ons-list-item>
                `);

                item.onclick = (e) => {
                    if (isDeleteMode) {
                        if (e.target.tagName.toLowerCase() !== 'ons-checkbox' && e.target.tagName.toLowerCase() !== 'input') {
                            const checkbox = item.querySelector('ons-checkbox');
                            if (checkbox) checkbox.checked = !checkbox.checked;
                        }
                    } else {
                        App.navigator.pushPage('details.html', { data: { songId: song.request_number } });
                    }
                };
                list.appendChild(item);
            });
            updateToolbar();

            if (btnToggle) {
                btnToggle.onclick = () => {
                    isDeleteMode = true;
                    updateToolbar();
                    list.querySelectorAll('.newfav-checkbox-container').forEach(el => el.style.display = '');
                };
            }

            if (btnCancel) {
                btnCancel.onclick = () => {
                    isDeleteMode = false;
                    updateToolbar();
                    list.querySelectorAll('.newfav-checkbox-container').forEach(el => {
                        el.style.display = 'none';
                        const cb = el.querySelector('ons-checkbox');
                        if (cb) cb.checked = false;
                    });
                };
            }

            if (btnExecute) {
                btnExecute.onclick = () => {
                    const checkboxes = Array.from(list.querySelectorAll('.newfav-checkbox'));
                    const selectedTimestamps = checkboxes.filter(cb => cb.checked).map(cb => parseInt(cb.value, 10));

                    if (selectedTimestamps.length === 0) {
                        ons.notification.alert('削除する楽曲を選択してください');
                        return;
                    }

                    ons.notification.confirm({
                        message: '選択した楽曲をお気に入りから削除しますか？',
                        callback: (idx) => {
                            if (idx === 1) {
                                App.NewFavorites.data = App.NewFavorites.data.filter(log => !selectedTimestamps.includes(log.timestamp));
                                App.NewFavorites.save();
                                ons.notification.toast('削除しました', { timeout: 1500 });
                                setupListSelectPage(page);
                            }
                        }
                    });
                };
            }
        }
    } else if (type === 'csSelect' || type.startsWith('banner')) {
        let titleText = 'CSセレクト';
        if (type === 'banner01') titleText = '特集プレイリスト1';
        if (type === 'banner02') titleText = '特集プレイリスト2';
        if (type === 'banner03') titleText = '特集プレイリスト3';
        title.textContent = titleText;

        const csSelectIds = App.Data[type] || [];
        if (csSelectIds.length === 0) {
            list.innerHTML = `<ons-list-item>${titleText}の登録楽曲はありません</ons-list-item>`;
        } else {
            csSelectIds.forEach(reqNum => {
                const song = App.Data.songs.find(s => s.request_number === reqNum);
                if (!song) return; // DBにない場合はスキップ

                const rawTypeCode = song.type_code || "99";
                const squareTypeCode = String(rawTypeCode).padStart(3, '0');
                const typeImg = squareTypeCode
                    ? `<img src="img/songtype/${squareTypeCode}.png" onerror="this.style.display='none'">`
                    : '';
                const machImg = song.model_code
                    ? `<img src="img/machinetype/${song.model_code}.png" onerror="this.style.display='none'">`
                    : `<span style="font-size:10px; color:#888;">${song.request_number}</span>`;

                const item = ons.createElement(`
                    <ons-list-item tappable class="search-result-item">
                        <div class="list-item-container">
                            <div class="list-item-song-type">${typeImg}</div>
                            <div class="list-item-main-content">
                                <div class="list-item-title-row">
                                    <div class="list-item-title">${song.title}</div>
                                    <div class="list-item-machine-type">${machImg}</div>
                                </div>
                                ${song.subtitle ? `<div class="list-item-subtitle">${song.subtitle}</div>` : ''}
                                <div class="list-item-artist">${song.artist}</div>
                            </div>
                        </div>
                    </ons-list-item>
                `);
                item.onclick = () => {
                    App.navigator.pushPage('details.html', { data: { songId: song.request_number } });
                };
                list.appendChild(item);
            });
        }
    } else if (type === 'genre') {
        title.textContent = 'ジャンル選択';
        list.style.display = 'block';

        App.Data.genres.forEach(g => {
            // g.descriptionがない場合は、とりあえずg.nameを表示
            const description = g.description || g.name;
            
            const item = ons.createElement(`
                <ons-list-item tappable class="machine-select-item" style="padding: 5px 0; min-height: 50px;">
                    <div class="left-section" style="height: auto;">
                        <img src="img/genreico/${g.id}.png" class="machine-list-img" onerror="this.style.display='none'">
                    </div>
                    <div class="right-section" style="display: flex; align-items: center;">
                        <div class="machine-description" style="font-size: 16px; font-weight: bold; line-height: 1.2;">${description}</div>
                    </div>
                </ons-list-item>
            `);
            item.onclick = () => {
                if (g.type === 'artist_filter') {
                    // 対象となる楽曲を持つアーティスト一覧を抽出
                    const artists = new Set();
                    App.Data.songs.forEach(s => {
                        if (g.filterCodes.includes(s.type_code)) {
                            if (s.artist) artists.add(s.artist);
                        }
                    });
                    const artistList = Array.from(artists).sort();
                    App.navigator.pushPage('results.html', { 
                        data: { 
                            searchResults: artistList, 
                            searchQuery: g.name,
                            genreFilter: g // ★絞り込み情報を渡す
                        } 
                    });
                } else if (g.type === 'anime_title') {
                    // アニメタイトル一覧へ遷移
                    App.navigator.pushPage('list_select.html', { data: { listType: 'anime_title', genreFilter: g } });
                } else if (g.type === 'direct_keyword') {
                    // remarks2等から直接抽出
                    let res = App.Data.songs.filter(s => s.remarks2 && s.remarks2.includes(g.keyword));
                    if (App.Settings.data.isLiteMode) res = res.filter(s => s.lite !== "1");
                    App.navigator.pushPage('results.html', { 
                        data: { 
                            searchResults: res, 
                            searchQuery: g.name 
                        } 
                    });
                }
            };
            list.appendChild(item);
        });

    } else if (type === 'anime_title') {
        const g = page.data.genreFilter;
        title.textContent = g.name;
        list.style.display = 'block';

        list.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">読み込み中...</div>';
        fetch('csv/animetitle.json')
            .then(res => res.json())
            .then(data => {
                list.innerHTML = '';
                if (!Array.isArray(data) || data.length === 0) {
                    list.innerHTML = '<ons-list-item>アニメタイトルが登録されていません</ons-list-item>';
                    return;
                }
                data.forEach(animeTitle => {
                    const item = ons.createElement(`
                        <ons-list-item tappable>
                            <div class="center" style="font-weight:bold;">${animeTitle}</div>
                        </ons-list-item>
                    `);
                    item.onclick = () => {
                        let res = App.Data.songs.filter(s => s.remarks1 === animeTitle);
                        if (g.filterCodes) {
                            res = res.filter(s => g.filterCodes.includes(s.type_code));
                        }
                        if (App.Settings.data.isLiteMode) res = res.filter(s => s.lite !== "1");
                        App.navigator.pushPage('results.html', { data: { searchResults: res, searchQuery: animeTitle } });
                    };
                    list.appendChild(item);
                });
            })
            .catch(err => {
                console.warn('Failed to load animetitle.json', err);
                list.innerHTML = '<ons-list-item style="color:red;">データの読み込みに失敗しました</ons-list-item>';
            });

    } else if (type === 'music_type') {
        title.textContent = '曲タイプ選択';
        list.style.display = 'block'; // 機種別と同様にリスト形式に

        const codes = [...new Set(App.Data.songs.map(s => s.genre_code).filter(Boolean))].sort();
        codes.forEach(c => {
            const typeInfo = App.Data.musicTypes[c];
            const description = (typeInfo && typeInfo.description) ? typeInfo.description : "このタイプの説明文は準備中です。";
            const typeName = (typeInfo && typeInfo.name) ? typeInfo.name : `タイプ ${c}`;

            const item = ons.createElement(`
                <ons-list-item tappable class="machine-select-item">
                    <div class="left-section" style="flex-direction: column; height: auto; min-height: 80px;">
                        <img src="img/musictype/${c}.png" class="machine-list-img" onerror="this.style.display='none'">
                        <div style="font-weight:bold; font-size:12px; text-align:center; margin-top:4px;">${typeName}</div>
                    </div>
                    <div class="right-section">
                        <div class="machine-description">${description}</div>
                    </div>
                </ons-list-item>
            `);
            item.onclick = () => {
                let res = App.Data.songs.filter(s => s.genre_code == c);
                if (App.Settings.data.isLiteMode) res = res.filter(s => s.lite !== "1");
                App.navigator.pushPage('results.html', { data: { searchResults: res, searchQuery: c } });
            };
            list.appendChild(item);
        });
    } else {
        title.textContent = '機種選択';
        list.style.display = 'block'; // 3列グリッドから通常リストに変更

        const codes = [...new Set(App.Data.songs.map(s => s.model_code).filter(Boolean))].sort();
        codes.forEach(c => {
            const modelInfo = App.Data.models[c];
            const description = (modelInfo && modelInfo.description) ? modelInfo.description : "この機種の説明文は準備中です。";
            const item = ons.createElement(`
                <ons-list-item tappable class="machine-select-item">
                    <div class="left-section">
                        <img src="img/machinetype/${c}.png" class="machine-list-img" onerror="this.style.display='none'">
                        <div class="machine-list-code">${c}</div>
                    </div>
                    <div class="right-section">
                        <div class="machine-description">${description}</div>
                    </div>
                </ons-list-item>
            `);
            item.onclick = () => {
                let res = App.Data.songs.filter(s => s.model_code == c);
                if (App.Settings.data.isLiteMode) res = res.filter(s => s.lite !== "1");
                App.navigator.pushPage('results.html', { data: { searchResults: res, searchQuery: `機種:${c}` } });
            };
            list.appendChild(item);
        });
    }
}

function setupNewSongsPage(page) {
    const list = page.querySelector('#newsongs-list');
    const segment = page.querySelector('#newsongs-segment');
    if (!list || !segment) return;

    const files = ['newsong01.json', 'newsong02.json', 'newsong03.json'];

    const loadNewSongs = (index) => {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">読み込み中...</div>';
        const file = 'csv/' + files[index];
        fetch(file)
            .then(res => res.json())
            .then(data => {
                list.innerHTML = '';
                let ids = [];
                if (Array.isArray(data)) {
                    ids = data;
                } else if (data && Array.isArray(data.data)) {
                    ids = data.data;
                }

                if (ids.length === 0) {
                    list.innerHTML = '<ons-list-item>この月の最新配信曲はありません</ons-list-item>';
                    return;
                }

                ids.forEach(reqNum => {
                    const song = App.Data.songs.find(s => s.request_number === reqNum);
                    if (!song) return;

                    const rawTypeCode = song.type_code || "99";
                    const squareTypeCode = String(rawTypeCode).padStart(3, '0');
                    const typeImg = squareTypeCode
                        ? `<img src="img/songtype/${squareTypeCode}.png" onerror="this.style.display='none'">`
                        : '';
                    const machImg = song.model_code
                        ? `<img src="img/machinetype/${song.model_code}.png" onerror="this.style.display='none'">`
                        : `<span style="font-size:10px; color:#888;">${song.request_number}</span>`;

                    const item = ons.createElement(`
                        <ons-list-item tappable class="search-result-item">
                            <div class="list-item-container">
                                <div class="list-item-song-type">${typeImg}</div>
                                <div class="list-item-main-content">
                                    <div class="list-item-title-row">
                                        <div class="list-item-title">${song.title}</div>
                                        <div class="list-item-machine-type">${machImg}</div>
                                    </div>
                                    ${song.subtitle ? `<div class="list-item-subtitle">${song.subtitle}</div>` : ''}
                                    <div class="list-item-artist">${song.artist}</div>
                                </div>
                            </div>
                        </ons-list-item>
                    `);
                    item.onclick = () => {
                        App.navigator.pushPage('details.html', { data: { songId: song.request_number } });
                    };
                    list.appendChild(item);
                });
            })
            .catch(err => {
                console.warn('Failed to load new songs', err);
                list.innerHTML = '<ons-list-item style="color:red;">データの読み込みに失敗しました</ons-list-item>';
            });
    };

    segment.addEventListener('postchange', (e) => {
        loadNewSongs(e.index);
    });

    // 初回ロード
    loadNewSongs(0);
}

// Force reload cache
 
