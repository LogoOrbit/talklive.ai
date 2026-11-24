package app.talklive.ui

import android.app.Application
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import app.talklive.social.Story
import app.talklive.social.StoryPerson
import app.talklive.ui.social.MyStoryBubble
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** Tapping "Your story" opens your story when you have one, and the editor when you do not. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], application = Application::class)
class StoryBubbleTest {
    @get:Rule val rule = createComposeRule()

    private fun me(n: Int) = StoryPerson("c_me", true, "Me", "owl",
        List(n) { Story("s$it", "hi", "blue", emptyList(), System.currentTimeMillis(), true) })

    @Test fun with_a_story_the_name_opens_it() {
        var opened = 0; var added = 0
        rule.setContent { MyStoryBubble(me(1), null, onAdd = { added++ }, onOpen = { opened++ }) }
        rule.onNodeWithText("Your story").performClick()
        assertEquals("opened/added", 1 to 0, opened to added)
    }

    @Test fun without_a_story_it_adds_one() {
        var opened = 0; var added = 0
        rule.setContent { MyStoryBubble(me(0), null, onAdd = { added++ }, onOpen = { opened++ }) }
        rule.onNodeWithText("Your story").performClick()
        assertEquals(0, opened)
        assertEquals(1, added)
    }
}
