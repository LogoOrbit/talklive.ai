package app.talklive.net

import app.talklive.BuildConfig

/** Where the TalkLive server is. Tests point it at a local server. */
object ServerConfig {
    @Volatile var url: String = BuildConfig.SERVER_URL
}
