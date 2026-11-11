package ws

import (
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/golang/mock/gomock"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"

	"github.com/mattermost/focalboard/server/auth"
	"github.com/mattermost/focalboard/server/model"
	wsMocks "github.com/mattermost/focalboard/server/ws/mocks"

	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

const testSingleUserToken = "single-user-token"

func startTestWSServer(t *testing.T) (*Server, string) {
	ctrl := gomock.NewController(t)
	store := wsMocks.NewMockStore(ctrl)
	store.EXPECT().GetMembersForBoard(gomock.Any()).Return([]*model.BoardMember{{UserID: model.SingleUser}}, nil).AnyTimes()

	server := NewServer(&auth.Auth{}, testSingleUserToken, false, mlog.CreateConsoleTestLogger(t), store)
	router := mux.NewRouter()
	server.RegisterRoutes(router)
	httpServer := httptest.NewServer(router)
	t.Cleanup(httpServer.Close)

	return server, "ws" + strings.TrimPrefix(httpServer.URL, "http") + "/ws"
}

func dialTestWS(t *testing.T, url string) *websocket.Conn {
	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	require.NoError(t, err)
	t.Cleanup(func() { conn.Close() })
	return conn
}

func readTestWSMessage(t *testing.T, conn *websocket.Conn) map[string]interface{} {
	require.NoError(t, conn.SetReadDeadline(time.Now().Add(5*time.Second)))
	var msg map[string]interface{}
	require.NoError(t, conn.ReadJSON(&msg))
	return msg
}

// waitForListeners waits until the server has processed the commands
// sent so far, using a PING round trip on each connection.
func syncTestWS(t *testing.T, conns ...*websocket.Conn) {
	for _, conn := range conns {
		require.NoError(t, conn.WriteJSON(map[string]string{"action": websocketActionPing}))
		require.Equal(t, websocketActionPong, readTestWSMessage(t, conn)["action"])
	}
}

func TestWebsocketConnection(t *testing.T) {
	t.Run("answers application pings before authentication", func(t *testing.T) {
		_, url := startTestWSServer(t)
		conn := dialTestWS(t, url)
		syncTestWS(t, conn)
	})

	t.Run("an invalid token gets an error and keeps the connection open", func(t *testing.T) {
		_, url := startTestWSServer(t)
		conn := dialTestWS(t, url)

		require.NoError(t, conn.WriteJSON(map[string]string{"action": websocketActionAuth, "token": "wrong"}))
		msg := readTestWSMessage(t, conn)
		require.Equal(t, websocketActionAuth, msg["action"])
		require.NotEmpty(t, msg["error"])

		syncTestWS(t, conn)
	})

	t.Run("every connection of a user gets their category updates", func(t *testing.T) {
		server, url := startTestWSServer(t)
		teamID := "team-id"

		conns := []*websocket.Conn{dialTestWS(t, url), dialTestWS(t, url)}
		for _, conn := range conns {
			require.NoError(t, conn.WriteJSON(map[string]string{"action": websocketActionAuth, "token": testSingleUserToken}))
			require.NoError(t, conn.WriteJSON(map[string]string{"action": websocketActionSubscribeTeam, "teamId": teamID}))
		}
		syncTestWS(t, conns...)

		server.BroadcastCategoryChange(model.Category{ID: "category-id", TeamID: teamID, UserID: model.SingleUser})
		for _, conn := range conns {
			msg := readTestWSMessage(t, conn)
			require.Equal(t, websocketActionUpdateCategory, msg["action"])
		}
	})

	t.Run("a block change is delivered once per connection", func(t *testing.T) {
		server, url := startTestWSServer(t)
		teamID := "team-id"

		conn := dialTestWS(t, url)
		require.NoError(t, conn.WriteJSON(map[string]string{"action": websocketActionAuth, "token": testSingleUserToken}))
		require.NoError(t, conn.WriteJSON(map[string]string{"action": websocketActionSubscribeTeam, "teamId": teamID}))
		syncTestWS(t, conn)

		// subscribe the same session to the block directly too
		listeners := server.getListenersForUser(teamID, model.SingleUser)
		require.Len(t, listeners, 1)
		server.subscribeListenerToBlocks(listeners[0], []string{"block-id"})

		server.BroadcastBlockChange(teamID, &model.Block{ID: "block-id", BoardID: "board-id"})
		msg := readTestWSMessage(t, conn)
		require.Equal(t, websocketActionUpdateBlock, msg["action"])

		// the next message must be the pong, not a duplicate update
		require.NoError(t, conn.WriteJSON(map[string]string{"action": websocketActionPing}))
		require.Equal(t, websocketActionPong, readTestWSMessage(t, conn)["action"])
	})

	t.Run("broadcasting while clients connect and leave does not race", func(t *testing.T) {
		server, url := startTestWSServer(t)

		var wg sync.WaitGroup
		for i := 0; i < 10; i++ {
			wg.Add(2)
			go func() {
				defer wg.Done()
				conn, _, err := websocket.DefaultDialer.Dial(url, nil)
				if err != nil {
					return
				}
				_ = conn.WriteJSON(map[string]string{"action": websocketActionAuth, "token": testSingleUserToken})
				_ = conn.WriteJSON(map[string]string{"action": websocketActionSubscribeTeam, "teamId": "team-id"})
				conn.Close()
			}()
			go func() {
				defer wg.Done()
				server.BroadcastSystemSettingsChange(model.AdminSystemSettings{})
				server.BroadcastBoardChange("team-id", &model.Board{ID: "board-id"})
			}()
		}
		wg.Wait()
	})

	t.Run("a client that can't keep up is dropped instead of blocking broadcasts", func(t *testing.T) {
		server, url := startTestWSServer(t)
		conn := dialTestWS(t, url)
		syncTestWS(t, conn)

		// never read from conn; the broadcasts must still return fast
		done := make(chan struct{})
		go func() {
			for i := 0; i < websocketSendBufferSize*4; i++ {
				server.BroadcastSystemSettingsChange(model.AdminSystemSettings{AppName: strings.Repeat("x", 64*1024)})
			}
			close(done)
		}()

		select {
		case <-done:
		case <-time.After(5 * time.Second):
			t.Fatal("broadcasts blocked on a slow client")
		}
	})
}
