package app.talklive

import app.talklive.support.SupportBot
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** The help chat answers clear questions and stays quiet (hands over to a person) otherwise. */
class SupportBotTest {
    @Test fun answersCommonQuestions(): Unit {
        assertEquals("How do I delete my account?", SupportBot.answer("how can I delete my account")?.question)
        assertEquals("My microphone is not working", SupportBot.answer("my mic doesnt work")?.question)
        assertEquals("I forgot my password", SupportBot.answer("forgot password help")?.question)
        assertEquals("How do I cancel Plus or get a refund?", SupportBot.answer("I want a refund")?.question)
    }

    @Test fun handsOverWhenUnsure(): Unit {
        assertNull(SupportBot.answer("hello"))
        assertNull(SupportBot.answer("my cat ate my homework"))
        assertNull(SupportBot.answer(""))
    }
}
