<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	let selectedUser: (typeof data.recentUsers)[0] | null = null;
	let newPassword = '';
	let confirmMsg = '';

	function selectUser(u: (typeof data.recentUsers)[0]) {
		selectedUser = u;
		newPassword = '';
		confirmMsg = '';
	}

	$: if (form && 'actionDone' in form) {
		confirmMsg =
			form.actionDone === 'clearSessions'
				? `✅ ${(form as any).count ?? '?'} session(s) cleared for ${(form as any).targetUsername}`
				: form.actionDone === 'resetPassword'
					? `✅ Password reset for ${(form as any).targetUsername} — all sessions invalidated`
					: form.actionDone === 'setPasswordStatus'
						? `✅ Status set to "${(form as any).status}" for ${(form as any).targetUsername}`
						: '';
	}

	$: displayUsers = (form && 'searchResults' in form)
		? (form as any).searchResults
		: data.recentUsers;

	$: searchQuery = (form && 'searchQuery' in form) ? (form as any).searchQuery : '';
</script>

<svelte:head><title>LighterPack – Moderation</title></svelte:head>

<div id="main" style="max-width:1280px;">
	<div id="sidebar">
		<h1>LighterPack</h1>
		<p style="color:#ccc; padding:0 10px; font-size:12px;">⚙️ Moderation Panel</p>
		<nav style="padding:10px;">
			<a href="/dashboard" style="color:#5b9bd5; font-size:13px;">← Back to Dashboard</a>
		</nav>
	</div>

	<div class="lpList">
		<div id="header" class="clearfix">
			<span class="headerItem" style="font-size:16px; font-weight:600; line-height:60px; padding-left:20px;">
				🔧 Admin / Moderation
			</span>
			<span class="headerItem" style="float:right; font-size:12px; color:#aaa; line-height:60px; margin-right:16px;">
				{data.username}
			</span>
		</div>

		<div style="display:grid; grid-template-columns:280px 1fr; gap:0; height:calc(100vh - 60px);">

			<!-- ====== LEFT: Suche + Userliste ====== -->
			<div style="border-right:1px solid #2a2a2a; overflow-y:auto; padding:16px;">

				<form method="POST" action="?/search" use:enhance style="margin-bottom:16px;">
					<div style="display:flex; gap:6px;">
						<input
							name="q"
							type="text"
							placeholder="Username or email…"
							value={searchQuery}
							style="flex:1; background:#1a1a1a; border:1px solid #333; color:#ddd; padding:6px 10px; border-radius:4px; font-size:13px;"
						/>
						<button type="submit" style="background:#385f8b; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:13px;">
							Search
						</button>
					</div>
				</form>

				{#if form && 'error' in form}
					<p style="color:#f66; font-size:12px; margin-bottom:10px;">⚠️ {(form as any).error}</p>
				{/if}

				<p style="color:#666; font-size:11px; margin-bottom:8px; text-transform:uppercase; letter-spacing:.05em;">
					{(form && 'searchResults' in form) ? `Search results (${displayUsers.length})` : `Recent users (${displayUsers.length})`}
				</p>

				<ul style="list-style:none; padding:0; margin:0;">
					{#each displayUsers as u}
						<li>
							<button
								on:click={() => selectUser(u)}
								style="
									width:100%; text-align:left; background:{selectedUser?.id === u.id ? '#1e3a5f' : 'transparent'};
									border:none; border-radius:4px; padding:8px 10px; cursor:pointer; color:#ddd;
									margin-bottom:2px; font-size:13px;
								"
							>
								<div style="font-weight:600; color:{selectedUser?.id === u.id ? '#7eb8f7' : '#ddd'};">{u.username}</div>
								<div style="font-size:11px; color:#888; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{u.email}</div>
								<div style="font-size:10px; color:#555; margin-top:2px;">
									{u.sessionCount} session{u.sessionCount !== 1 ? 's' : ''} ·
									<span style="color:{u.passwordStatus === 'active' ? '#3a3' : '#a63'};">{u.passwordStatus}</span>
								</div>
							</button>
						</li>
					{/each}
				</ul>
			</div>

			<!-- ====== RIGHT: User-Detail ====== -->
			<div style="padding:24px; overflow-y:auto;">
				{#if !selectedUser}
					<div style="color:#555; text-align:center; margin-top:80px; font-size:14px;">
						← Select a user to view details
					</div>
				{:else}
					<div style="display:flex; align-items:baseline; gap:12px; margin-bottom:20px; border-bottom:1px solid #222; padding-bottom:16px;">
						<h2 style="margin:0; font-size:20px; color:#eee;">{selectedUser.username}</h2>
						<span style="font-size:12px; color:#888;">{selectedUser.email}</span>
						<span style="font-size:11px; color:#555; margin-left:auto;">ID: {selectedUser.id}</span>
					</div>

					{#if confirmMsg}
						<div style="background:#1a3a1a; border:1px solid #2a6a2a; border-radius:4px; padding:10px 14px; margin-bottom:16px; font-size:13px; color:#7f7;">
							{confirmMsg}
						</div>
					{/if}

					<!-- Info-Grid -->
					<div style="display:grid; grid-template-columns:140px 1fr; gap:6px 12px; font-size:13px; margin-bottom:24px;">
						<span style="color:#666;">User ID</span>
						<span style="color:#aaa; font-family:monospace; font-size:11px;">{selectedUser.id}</span>

						<span style="color:#666;">E-Mail</span>
						<span style="color:#ddd;">{selectedUser.email}</span>

						<span style="color:#666;">Registriert</span>
						<span style="color:#ddd;">{new Date(selectedUser.createdAt).toLocaleString('de-DE')}</span>

						<span style="color:#666;">Passwort-Status</span>
						<span style="color:{selectedUser.passwordStatus === 'active' ? '#5d5' : '#d85'};">
							{selectedUser.passwordStatus}
						</span>

						<span style="color:#666;">Aktive Sessions</span>
						<span style="color:#ddd;">{selectedUser.sessionCount}</span>
					</div>

					<!-- Aktionen -->
					<div style="display:flex; flex-direction:column; gap:20px;">

						<!-- Sessions löschen -->
						<section style="background:#1a1a1a; border:1px solid #2a2a2a; border-radius:6px; padding:16px;">
							<h3 style="margin:0 0 8px; font-size:13px; color:#aaa; text-transform:uppercase; letter-spacing:.05em;">
								🔐 Sessions
							</h3>
							<p style="font-size:12px; color:#666; margin:0 0 12px;">
								Löscht alle aktiven Logins — der User muss sich neu einloggen.
							</p>
							<form method="POST" action="?/clearSessions" use:enhance on:submit={() => { confirmMsg = ''; }}>
								<input type="hidden" name="userId" value={selectedUser.id} />
								<input type="hidden" name="username" value={selectedUser.username} />
								<button
									type="submit"
									style="background:#5a2020; color:#fcc; border:1px solid #7a3030; padding:7px 16px; border-radius:4px; cursor:pointer; font-size:13px;"
								>
									Clear all sessions ({selectedUser.sessionCount})
								</button>
							</form>
						</section>

						<!-- Passwort zurücksetzen -->
						<section style="background:#1a1a1a; border:1px solid #2a2a2a; border-radius:6px; padding:16px;">
							<h3 style="margin:0 0 8px; font-size:13px; color:#aaa; text-transform:uppercase; letter-spacing:.05em;">
								🔑 Passwort zurücksetzen
							</h3>
							<p style="font-size:12px; color:#666; margin:0 0 12px;">
								Setzt ein neues Passwort und invalidiert alle Sessions.
							</p>
							<form method="POST" action="?/resetPassword" use:enhance on:submit={() => { confirmMsg = ''; }}>
								<input type="hidden" name="userId" value={selectedUser.id} />
								<input type="hidden" name="username" value={selectedUser.username} />
								<div style="display:flex; gap:8px; align-items:center;">
									<input
										name="newPassword"
										type="text"
										placeholder="New password (min. 8 chars)"
										bind:value={newPassword}
										style="flex:1; background:#111; border:1px solid #333; color:#ddd; padding:7px 10px; border-radius:4px; font-size:13px; font-family:monospace;"
									/>
									<button
										type="submit"
										disabled={newPassword.length < 8}
										style="background:{newPassword.length >= 8 ? '#1a4a2a' : '#111'}; color:{newPassword.length >= 8 ? '#7f7' : '#444'}; border:1px solid {newPassword.length >= 8 ? '#2a6a3a' : '#222'}; padding:7px 16px; border-radius:4px; cursor:{newPassword.length >= 8 ? 'pointer' : 'not-allowed'}; font-size:13px;"
									>
										Set Password
									</button>
								</div>
							</form>
						</section>

						<!-- Passwort-Status ändern -->
						<section style="background:#1a1a1a; border:1px solid #2a2a2a; border-radius:6px; padding:16px;">
							<h3 style="margin:0 0 8px; font-size:13px; color:#aaa; text-transform:uppercase; letter-spacing:.05em;">
								⚠️ Passwort-Status
							</h3>
							<p style="font-size:12px; color:#666; margin:0 0 12px;">
								Erzwingt beim nächsten Login einen Passwort-Reset.
							</p>
							<form method="POST" action="?/setPasswordStatus" use:enhance on:submit={() => { confirmMsg = ''; }}>
								<input type="hidden" name="userId" value={selectedUser.id} />
								<input type="hidden" name="username" value={selectedUser.username} />
								<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
									<select
										name="status"
										style="background:#111; border:1px solid #333; color:#ddd; padding:7px 10px; border-radius:4px; font-size:13px;"
									>
										<option value="active" selected={selectedUser.passwordStatus === 'active'}>active</option>
										<option value="must_reset" selected={selectedUser.passwordStatus === 'must_reset'}>must_reset</option>
										<option value="imported_no_password" selected={selectedUser.passwordStatus === 'imported_no_password'}>imported_no_password</option>
									</select>
									<button
										type="submit"
										style="background:#3a3a1a; color:#fd7; border:1px solid #5a5a2a; padding:7px 16px; border-radius:4px; cursor:pointer; font-size:13px;"
									>
										Set Status
									</button>
								</div>
							</form>
						</section>

					</div>
				{/if}
			</div>
		</div>

		<div id="lpFooter">
			<span>LighterPack Community Edition</span>
			<span>⚙️ Moderation Panel</span>
		</div>
	</div>
</div>
