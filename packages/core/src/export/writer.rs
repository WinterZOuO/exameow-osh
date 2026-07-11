use crate::error::CoreError;
use crate::exam::Question;
use csv::WriterBuilder;
use std::io::Write;

pub fn export_csv(questions: &[Question], path: &str) -> Result<(), CoreError> {
    let mut wtr = WriterBuilder::new()
        .from_path(path)
        .map_err(|e| CoreError::Export(format!("cannot create CSV file: {e}")))?;

    write_csv_records(questions, &mut wtr)?;

    Ok(())
}

pub fn export_csv_to_writer<W: Write>(questions: &[Question], writer: W) -> Result<(), CoreError> {
    let mut wtr = WriterBuilder::new()
        .from_writer(writer);

    write_csv_records(questions, &mut wtr)?;

    Ok(())
}

fn write_csv_records<W: Write>(questions: &[Question], wtr: &mut csv::Writer<W>) -> Result<(), CoreError> {
    wtr.write_record(["id", "type", "stem", "options", "answer", "analysis"])
        .map_err(|e| CoreError::Export(format!("write error: {e}")))?;

    for q in questions {
        let options_str = q.options.join("|");
        wtr.write_record([
            &q.id,
            &q.qtype.to_string(),
            &q.stem,
            &options_str,
            &q.answer,
            &q.analysis,
        ])
        .map_err(|e| CoreError::Export(format!("write error: {e}")))?;
    }

    wtr.flush()
        .map_err(|e| CoreError::Export(format!("flush error: {e}")))?;

    Ok(())
}
